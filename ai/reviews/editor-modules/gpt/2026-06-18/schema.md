# schema 模块 review

范围：`apps/web/src/editor/schema`

## 模块意图

`schema` 是编辑器文档模型层，承担：

- 创建各种 schema item：page、frame、group、rect、ellipse、polygon、star、line、text、fill、stroke、shadow。
- 维护扁平 schema 表和父子关系。
- 提供树遍历、祖先查询、children 查询、矩阵累积等 helper。
- 把历史 schema 迁移到当前版本。

这个模块在架构上应该尽量接近“纯领域模型”，不要知道 UI、view、当前选区、YState 的太多细节。

## 架构评价

### 优点

- 扁平 schema 表加 `childIds / parentId` 是合理的，适合 Yjs 局部 patch 和快速按 id 查询。
- `SchemaCreator` 统一创建节点，避免 view 或 stage 到处手写默认值。
- `SchemaHelper.createTraverse2()` 比旧的 `createTraverse()` 更接近纯 schema traversal，方向更好。
- `migration.ts` 有明确 migration list 和描述，说明已经在考虑 schema 演进。
- 矩阵相关 helper，例如 `getSceneMatrix()`，是 stage/render 需要的关键能力。

### 主要问题

#### 1. schema creator 依赖 view / i18n / theme，领域模型不够独立

`creator.ts` 直接依赖：

- `src/view/assets/assets`
- `src/view/i18n/config`
- `src/view/styles/color`
- `src/utils/color`

从意图上看，schema creator 应该创建文档数据；默认图片、默认名称翻译、主题色可以由上层传入。现在 schema 层知道 view 资源，会让内核难以复用，也让测试变重。

建议：把默认值分两层。

- `schema/defaults`：纯数据默认值，例如默认宽高、默认矩阵、默认 fill 结构。
- `editor/presets` 或 view 层：带 i18n、theme、asset 的产品默认值。

#### 2. schema v2 类型与 creator 输出不完全一致

从当前 v2 类型看，节点元信息需要 `__isNode: true`，节点效果里有 `flip`，page 也有 `matrix`。但 `SchemaCreator`：

- `page()` 没有 `matrix`。
- `createSchemaMeta()` 没有 `__isNode`。
- `createNodeBase()` 没有 `flip`。
- `createNodeBase()` 还写入 `x / y / rotation`，这更像 v1 OBB 模型。
- `meta().version` 写的是 `'v0'`，而 v2 类型里是 `number`。

这说明 schema v2 的迁移没有完全落地。这个问题优先级很高，因为 creator 是所有新节点的源头。如果源头仍产生半 v1 / 半 v2 数据，后面的 render、operate、migration 都很难稳定。

#### 3. 几何模型混杂

`SchemaCreator.line()` 里：

- 从 `nodeBase.x/y` 创建 start。
- 读取 `option?.rotation || nodeBase.rotation`。
- 把 rotation 传给 `createLine()`。

但 `createLine()` 实际只接收 `start, length`，rotation 被忽略。更深层的问题是：如果当前模型已经是 `matrix + width/height`，line points 应该是局部坐标，位置和旋转应该由 matrix 决定，而不是由 point 坐标和 node x/y 混合决定。

建议：所有 vector points 都采用节点局部坐标；节点定位、旋转、缩放只由 matrix 表达。

#### 4. `SchemaHelper` 不是纯 helper，直接耦合全局 YState 和当前选区

`helper.ts` 里大量方法直接 `YState.find()`，`createCurrentPageTraverse()` 还读取当前选中 page。这使它更像“全局文档查询服务”，不是纯 schema helper。

短期可以接受，但建议分层：

- 纯函数：输入 schema / ids，输出遍历结果。
- 运行时查询：绑定当前 `YState` 和 `HandleSelect`。

这样 migration、测试、导入导出可以只使用纯函数。

#### 5. `isNode()` 依赖 `__isNode`，但新节点可能没有

`SchemaHelper.isNode()` 判断 `__isNode in item && item.__isNode`。如果 creator 新节点没有 `__isNode`，就会出现“新创建节点不是 node”的荒谬情况。

这会影响：

- migration 中 parent 判断。
- `SchemaHelper.isById(id, 'nodeParent')` 间接逻辑。
- 所有根据 isNode 处理矩阵的地方。

建议要么 creator 必须补 `__isNode`，要么 isNode 判断改成基于 type 白名单。

#### 6. migration 版本机制不稳

`migrationSchema()` 里：

```ts
const version = schema?.meta?.version
const migrations = migrationList.slice(version)
```

如果 version 是 `'v0'`、`undefined` 或非法值，`slice()` 的行为会退化成从 0 开始或不可预期。迁移结束又写 `newSchema.meta.version = migrationList.length`，从字符串变数字。

建议：

- 明确 schema version 是 number。
- 对非法 version 做显式 fallback 和日志。
- migration list 的 index 与 version 语义要写清楚：version 表示“已应用到第几个 migration”，还是“当前 schema 版本号”。

#### 7. migration 与类型命名不一致

迁移里出现 `rectangle`、`path`，但当前 creator/type 使用的是 `rect`、`irregular`。这可能是历史兼容，也可能是遗漏。建议在 migration 中明确列出旧类型到新类型的映射，而不是混在节点类型集合里。

## 文件级评价

### `creator.ts`

这是 schema 的入口文件，价值很高，但也是当前 v1/v2 混杂最明显的位置。优先修正：

- 默认 meta version。
- page matrix。
- node `__isNode / flip`。
- line 的局部 points 与 matrix 模型。
- 去掉 view 依赖或抽成可注入默认值。

### `helper.ts`

遍历能力是对的，尤其 `createTraverse2()` 值得保留并强化。建议逐渐减少直接依赖 `YState` 的静态方法，把纯 schema traversal 和当前运行时查询拆开。

命名上，`findParent()` 实际更像找最近 frame 或根 parent，不是普通 parent。建议改名或补注释，否则调用方容易误解。

### `migration.ts`

方向正确，但需要更严格的版本输入和输出。迁移函数最好是幂等、可测试、明确输入版本的。当前版本类型混杂会让老文件导入变成运气问题。

## 建议优先级

1. 统一 schema v2 默认节点结构，保证 creator 输出满足当前类型。
2. 明确 version 为 number，并修正 migration 入口。
3. 把 schema creator 中的 view/i18n/theme 依赖移出去。
4. 将 helper 拆成纯 schema helper 与运行时 document query。
5. 给 migration 增加基于 fixture 的最小测试，尤其测试 v1 节点迁到 matrix 后的嵌套坐标。
