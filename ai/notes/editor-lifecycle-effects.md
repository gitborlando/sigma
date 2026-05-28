# Editor Lifecycle Effects Note

## 背景

当前编辑器里有不少 service 会在初始化时注册副作用，例如 DOM event、Signal hook、MobX reaction、Yjs observe、awareness、render 订阅和 command hook。现有模式大体是：

```txt
service.subscribe() / service.init()
  -> 返回 disposer 或内部保存 disposer

Editor.dispose()
  -> 统一释放
```

这个模式可以继续使用，但它有一个结构性问题：service 容易同时承担“业务状态能力”和“运行时接线 / 生命周期管理”。随着编辑器能力增加，service 会越来越像副作用容器，导致初始化顺序、依赖关系和释放责任不够清楚。

这份 note 只记录生命周期副作用的整理方向，不属于当前 monorepo 迁移主线，也不应干涉既定阶段计划。

## 核心判断

副作用不可能完全消失。谁创建监听，谁至少要知道如何取消。

更好的方向不是引入复杂框架，而是区分三类代码：

```txt
service：状态和业务能力
effect：运行时接线，负责订阅、监听、绑定，并返回 disposer
session：一次编辑器运行会话，负责启动 effect 和统一释放
```

关键约束是：

```txt
service 不持有 disposer
effect 返回 disposer
session 持有 disposer
```

如果只是把代码从 service 搬到另一个文件，但 service 仍然管理 disposer，那么收益很小，甚至只是换位置混杂。

## 为什么提取 effect

提取 effect 的意义不是少写 dispose，而是明确职责边界。

`YState` 这类 service 更适合只表达：

- 当前 schema 状态。
- `set` / `insert` / `delete` / `find` 等状态操作。
- 与状态相关的纯业务能力。

而这些内容更适合放在 effect 中：

- `YState <-> Y.Doc` 绑定。
- `YState` patch flush 订阅。
- `YState patch -> StageScene render`。
- `YClients <-> awareness`。
- DOM mouse / keyboard / wheel 事件。
- command / operate hook 的运行时注册。

这样做的主要收益：

- service 不再知道自己运行在哪个会话里。
- effect 函数天然暴露资源生命周期，调用后必须释放。
- session 可以集中看见一次编辑器启动挂了哪些副作用。
- 跨 service 的 glue code 不会被硬塞进某个 service。
- 后续拆 core / renderer / runtime 包时，service 更容易下沉，effect 留在 app 或 runtime 层。

## 放置位置

不建议一开始建立全局 `effects/` 大目录。它容易变成新的大桶，和把副作用塞进 service 本质上差别不大。

更合适的方式是按领域贴近放：

```txt
apps/web/src/editor/
  editor/
    editor-session.ts

  y-state/
    y-state.ts
    y-state-effects.ts

  render/
    scene.ts
    render-effects.ts

  stage/
    stage-effects.ts

  operate/
    operate-effects.ts
```

放置规则：

- 主要服务单一领域的 effect，放在该领域目录旁边。
- 跨领域 effect 按“结果归属”放。例如 `YState patch -> render` 更像 render effect。
- 只负责启动编排的代码放在 `editor/editor-session.ts`。
- 暂时不要建顶层 `editor/effects`，除非未来确实出现稳定的大量跨领域 effect，并能继续拆分子目录。

## 判断标准

适合提取成 effect：

- DOM event。
- Signal hook。
- MobX reaction。
- Yjs observe / provider / awareness。
- timer / animation frame。
- global hotkey。
- 跨多个 service 的订阅 glue code。
- 任何调用后必须返回 disposer 的运行时绑定。

不必提取：

- 普通 set / get。
- 纯计算。
- 只修改本 service 内部状态的方法。
- 简单业务命令。

## 渐进路线

不要为了这个方向打断当前 monorepo 迁移。真正需要治理生命周期时，可以小步推进：

1. 先保留现有 singleton service。
2. 新增 `editor-session.ts`，只做一次编辑器运行会话的生命周期编排。
3. 优先把 `YState` 中的 `bind()` 和 patch flush 提到 `y-state-effects.ts`。
4. 后续看到哪个 service 因 `subscribe()` / `initHook()` 变胖，再迁一个 effect。
5. 不在同一轮里同时重构状态源、目录结构和业务行为。

## 一句话结论

effect 不是新的抽象层噱头，而是把“状态 / 业务能力”和“运行时接线 / 生命周期副作用”分开。它应该按领域贴近放，最后由 `editor-session.ts` 统一编排；如果做不到 `service 不持有 disposer、effect 返回 disposer、session 持有 disposer`，就不值得拆。
