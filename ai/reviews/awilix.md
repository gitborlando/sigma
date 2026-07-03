# Awilix DI Review

Review 时间：2026-07-03

## 背景

当前编辑器运行时使用 awilix 作为 service container：

- `apps/web/src/editor/index.ts` 创建 editor container。
- `editorServices` 统一注册 controller、core、handle、render、stage、workbench、Yjs 相关 service。
- 大部分 service 通过 constructor 参数注入依赖。

这个方向本身没有问题。问题在于当前 container 使用的是 `CLASSIC` injection mode：

```ts
private container = createContainer<EditorServices>({
  injectionMode: 'CLASSIC',
})
```

`CLASSIC` 模式会读取函数或 class constructor 的参数名，再按参数名去 container 中找同名注册项。

例如：

```ts
constructor(
  private readonly schemaCreator: SchemaCreatorService,
  private readonly yState: YStateService,
) {}
```

awilix 会解析出 `schemaCreator` 和 `yState`，然后 resolve 对应服务。

## 主要风险

### 1. `CLASSIC` 不适合前端 minify 代码

前端生产构建通常会压缩代码，constructor 参数名可能被改成短变量：

```ts
constructor(e, t) {}
```

这时 awilix 会尝试 resolve `e` 和 `t`，而不是 `schemaCreator` 和 `yState`。容器中没有这些注册项，编辑器生产环境就可能在 service resolve 阶段失败。

awilix 官方对这个风险是有说明的：`CLASSIC` 依赖参数名，因此不适合 minified code。awilix 默认模式其实是 `PROXY`，不是 `CLASSIC`。

### 2. 现有 Vite build 没有保护参数名

`apps/web/vite.config.ts` 当前 build 配置只包含：

```ts
build: {
  commonjsOptions: {
    transformMixedEsModules: true,
  },
},
```

没有看到保留函数名、保留参数名或关闭 minify 的配置。因此不能假设生产构建会保留 constructor 参数名。

### 3. 风险集中在 editor service graph

受影响的不是某一个 service，而是整个 editor container：

- `SchemaController`
- `StageController`
- `NodeController`
- `RendererService`
- `RenderTreeService`
- `StageCreateService`
- `StageTransformerService`
- `CommandService`
- 以及所有通过 constructor 参数注入依赖的 service

因为它们都依赖 awilix 根据参数名完成注入。

## 推荐方向

### 首选：迁移到 `PROXY` injection mode

`PROXY` 模式不依赖 constructor 参数名，而是把 cradle 对象注入进去，再通过属性名读取依赖。

推荐目标形态：

```ts
private container = createContainer<EditorServices>({
  injectionMode: 'PROXY',
})
```

service 构造器改成对象参数：

```ts
constructor({
  schemaCreator,
  yState,
}: Pick<EditorServices, 'schemaCreator' | 'yState'>) {
  super()
  this.schemaCreator = schemaCreator
  this.yState = yState
  autoBind(this)
}
```

或者更简单地定义局部依赖类型：

```ts
type SchemaControllerDeps = Pick<
  EditorServices,
  'schemaCreator' | 'yState' | 'ySync' | 'yAware' | 'undo' | 'handleSelect'
>
```

然后 constructor 接收 `SchemaControllerDeps`。

注意：不能只把 `CLASSIC` 改成 `PROXY` 一行。现有 constructor 是位置参数，直接切换会导致 service 收到 cradle 对象而不是原来的多个参数。

### 迁移策略

建议小步做：

1. 先选依赖最少的 service 试迁，确认模式。
2. 再迁 controller / render / stage 这几组高频 service。
3. 最后统一把 container mode 改成 `PROXY`。
4. 迁移完成后执行一次 `pnpm --filter @sigma/web build` 验证生产构建路径。

如果要避免一次大改，也可以临时给单个 resolver 设置 injection mode，但长期还是建议 editor container 统一一种模式。

## 不推荐方案

### 不推荐靠关闭压缩解决

关闭生产压缩或强行保留参数名可以绕过问题，但这会把 DI 的正确性绑定到 bundler 配置上。后续换构建配置、升级 Vite、接入其他压缩器时，风险会重新出现。

### 不推荐长期继续使用 `CLASSIC`

`CLASSIC` 更适合 Node 服务端或不会 minify 的环境。当前项目是前端 Vite app，生产代码天然会走 bundling 和 minify，继续使用 `CLASSIC` 不符合运行环境。

## 结论

当前 awilix 的使用方式是一个生产构建风险点：代码在 dev 环境正常，不代表 build 后仍能正常 resolve 依赖。

建议把 editor container 从 `CLASSIC` 迁到 `PROXY`，并把 service constructor 从位置参数改成对象依赖参数。这样 DI 边界会更明确，也不会再依赖压缩后不可控的函数参数名。
