# GPT-5.5 项目评价

评价时间：2026-05-15

## 结论

Sigma 是一个技术含量很高的在线矢量设计编辑器：Canvas 2D 自研渲染、矩阵化几何模型、脏矩形/分片渲染、Yjs 状态桥接、React 工具型 UI 都已经具备雏形。它不是普通 CRUD 项目，而是在做真实设计工具内核。

但按当前仓库状态客观判断，它更像一个“核心思路很强、工程收敛尚未完成”的个人项目。生产可用性主要被四件事拉低：协作链路默认未启用、旧状态系统残留较多、类型检查无法作为质量门禁、核心逻辑没有测试保护。

如果只看架构想法和核心能力，项目可以给到 7.5/10；如果按当前可维护性、可靠性、团队接手成本综合打分，我会给 6.6/10。潜力很高，但现在还不是一个工程上稳定闭环的编辑器。

## 研究范围

本次阅读了项目入口、构建配置、编辑器内核、渲染层、交互层、Yjs 状态层、Schema/Immut、React 视图层、全局服务、SDK、i18n、样式与文档。也执行了可复现检查：

- `pnpm build`：通过，约 12.52 秒。
- 产物主 JS：约 1,521.41 kB，gzip 约 484.34 kB，Vite 提示 chunk 过大。
- `pnpm exec tsc --noEmit --pretty false`：超过 5 分钟仍未完成。
- 未发现 test/lint 脚本，也未发现常规单元测试。
- `src` 下约 175 个 TS/TSX 文件，约 16,249 行。
- `src/editor` 约 8,879 行，`src/view` 约 5,485 行。

## 架构画像

项目大体分为五层：

| 层         | 主要目录                                                     | 评价                                              |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------- |
| 应用入口   | `src/index.ts`, `src/view/app.tsx`, `src/view/router.tsx`    | Vite + React 18 + React Router，入口简洁          |
| 编辑器服务 | `src/editor/editor`                                          | 负责初始化 schema、订阅模块、注册命令和设置       |
| 数据层     | `src/utils/immut`, `src/editor/y-state`, `src/editor/schema` | 自研 Immut patch + Yjs，有深度，但新旧链路并存    |
| 渲染/交互  | `src/editor/render`, `src/editor/stage`                      | 项目最强部分，Canvas 渲染优化和事件分发都比较认真 |
| 视图层     | `src/view/editor`, `src/view/component`                      | 工具软件布局明确，组件风格克制，但有残留和不一致  |

## 主要优点

### 1. 渲染层有真实设计工具意识

`StageSurface` 不是简单地每次全量重绘，而是实现了主 Canvas + 顶层 Canvas 分离、脏矩形收集、局部重绘、缩放分片渲染、平移时 `drawImage` 复用已有画面。这些都是设计工具在复杂画布里真正需要的能力。

`Elem` 把节点矩阵、全局矩阵、AABB、可见性、事件命中做了封装；`HitTest` 也不是只用矩形包围盒，而是覆盖了圆角矩形、椭圆、多边形、折线等具体图形。这个方向是对的。

### 2. 几何模型选型成熟

项目没有把 `x/y/rotation` 当成唯一事实来源，而是使用 `Matrix` 和 `MRect` 表达节点几何。对于旋转、缩放、嵌套 frame、局部坐标和场景坐标转换，这比散落的几何字段更适合长期扩展。

`StageViewport` 里的 client/canvas/stage/scene 坐标转换也比较完整，缩放范围、滚轮缩放、zoom-to-fit 都有实现。

### 3. Immut + Yjs 桥接有探索价值

`src/utils/immut/immut.ts` 提供了路径式变更、patch 收集、浅克隆更新和订阅机制；`immut-y.ts` 负责把普通对象状态和 Y.Map/Y.Array 双向同步。这个设计能让业务代码主要操作普通对象，同时保留 CRDT 同步能力。

这套模型如果稳定下来，是项目区别于普通前端编辑器 demo 的核心资产。

### 4. 编辑器工作台 UI 方向正确

整体是 Header + LeftPanel + Stage + RightPanel 的专业工具布局，符合类 Figma 产品的心智。按钮、输入框、属性面板、图层面板、画布控件都围绕工作区展开，没有做成营销页或普通后台。

Linaria 组织局部样式、自建 `G/Grid` 组件、使用 lucide 图标和 React Query，这些选择整体服务于工具型产品。

### 5. 生命周期清理意识较好

`Disposer` 模式在编辑器订阅、事件监听和模块销毁里反复出现，说明作者明确知道这类长生命周期编辑器最怕事件残留和重复订阅。

## 主要问题

### 1. README 宣称协作，但当前默认代码没有真正启用远程协作

`EditorService.initSchema` 里初始化了 `YClients.init()`，但 `YSync.init(fileId, YState.doc)` 被注释；`YState.initSchema` 里也注释了 `YSync.init`。这意味着当前默认路径只是本地 Y.Doc + 本地 awareness 状态，并没有连接 Hocuspocus Provider。

因此“通过 Yjs 支持多人实时协作”更像设计目标或历史能力，而不是当前默认构建下已经跑通的事实。建议要么恢复并验证协作链路，要么在 README 里明确标注“协作暂未启用”。

### 2. 新旧状态系统并存，维护风险偏高

当前主线看起来正在转向 `YState + Immut + Undo`，但旧的 `Schema/SchemaHistory/OperateNode/OperateStroke/OperateShadow/OperateText` 链路还大量保留。

典型例子：

- `src/editor/schema/schema.ts` 中 `commitOperation` 直接 `return`，旧 operation 系统已基本失效。
- `src/editor/schema/history.ts` 的 undo/redo 开头直接转发到 `Undo`，后续旧逻辑不可达。
- `src/editor/operate/align.ts` 仍引用 `SchemaUtil`，但没有导入；运行到相关分支会出错。
- `src/editor/render/widget/adsorption.ts` 仍引用旧的 Pixi、`src/shared`、`OperateMeta`、`StageTransform` 等不存在或过期模块。

这类残留会让读代码的人不知道哪条链路才是事实来源，也会让未来修功能时误改旧代码。

### 3. 构建通过不等于类型健康

`pnpm build` 能过，是因为 Vite/esbuild 不做完整 TypeScript 类型检查。`tsc --noEmit` 超过 5 分钟未完成，说明类型检查目前无法作为日常质量门禁。

同时存在明显类型事实不一致：

- `types/schema/schema-v2.d.ts` 里 `Meta.version` 是 `number`，但 `SchemaCreator.meta()` 返回 `version: 'v0'`。
- `types/schema/schema-v2.d.ts` 里 `Page` 要求 `matrix`，但 `SchemaCreator.page()` 没有提供。
- `types/schema/schema-v2.d.ts` 使用了 `AllKeys<IFill>`，但未看到对应声明，且 `IFill` 与当前 `S.Fill` 命名不一致。
- 大量全局 auto-import 掩盖了依赖来源，类型边界更难追踪。

### 4. 测试缺失是最大工程短板

最应该有测试的地方目前都没有测试：`Immut`、`immut-y`、`Matrix`、`MRect`、`SchemaHelper`、`Undo`、命中测试、文本换行。这些模块都属于“错一点就全局异常”的基础设施。

没有测试时，重构旧状态链路、优化渲染、修协作都会非常危险。

### 5. 部分功能是半成品或占位实现

仓库里有不少“能看出方向，但没有收口”的功能：

- `HandleNode.wrapInFrame()` 直接 `throw new Error('Not implemented')`，但命令菜单会调用它。
- 图层面板使用 dnd-kit，但 `handleDragEnd` 没有真正重排 schema。
- `drop.ts`、SVG parser、阴影面板等大量代码被整体注释。
- `TextComp`、`icons.tsx`、`vector-edit.tsx` 等旧视图引用 `src/shared` 或 Pixi 相关模块，但当前主应用没有接上。
- `StageCreate` 创建 line 时旋转/长度更新逻辑仍有注释，功能未完全闭环。

这些不一定影响当前最小路径，但会显著影响项目可信度和后续维护。

### 6. 有几个明确的运行时风险

- `Undo.undo()` / `redo()` 没有内部 guard。UI 禁用按钮能挡住一部分，但快捷键 `ctrl+z` / `ctrl+shift+z` 会直接调用，空栈时可能访问 `undefined.type`。
- `InputNum` 的 `handleEnd` 使用 `if (!finalValue) return`，导致用户把值改成 `0` 时不会触发 `onEnd`，几何属性归零会有问题。
- `migrationSchema` 会 `console.log('newSchema')` 输出完整 schema，真实文件大时会污染控制台并拖慢调试。
- `HomeFilesComp` 的 key 使用 `file.id + miniId()`，每次渲染都会改变 key，React 无法稳定复用列表项。

### 7. 与项目规范有几处冲突

`AGENTS.md` 里要求所有代码 TypeScript、使用 pnpm、文件名 kebab-case、不要用 tailwind.css、参考 Linaria。当前仓库存在：

- `src/view/pages/a.js`、`src/view/pages/b.js` 两个 JS 实验文件。
- `src/view/app.css` 直接 `@import 'tailwindcss'`，并且有 Tailwind class 使用。
- `src/view/assets/editor/RP` 使用大写目录。
- `GraphemeBreak.ts`、`LineBreaker.ts`、`UnicodeTrie.ts`、`unicodeData.ts`、`immut copy 2.ts` 等不符合 kebab-case。

这些问题不影响算法价值，但会降低规范可信度。

### 8. 包体与依赖需要收敛

当前主 chunk 超过 1.5 MB，gzip 后约 484 kB。对于设计工具可以接受一定体积，但仍有优化空间，尤其是：

- 首页和编辑器可以拆包。
- 文本换行 Unicode 数据可以考虑懒加载。
- Tailwind 和 Linaria 同时存在，需要明确是否真的都需要。
- 一些历史依赖和旧代码引用已经不在主路径上，应该清理。

### 9. 安全和服务边界需要明确

`src/global/sdk/supabase.ts` 里直接放了 Supabase anon key。anon key 出现在前端本身不是绝对错误，但必须依赖严格 RLS；仓库里应明确说明这是 public anon key，并确认表策略不能被滥用。

`src/global/sdk/cos.ts` 通过公开函数 URL 获取 COS 临时凭证，也需要确认服务端有鉴权、限流、来源校验和最小权限。否则上传能力可能被外部滥用。

## 与 README 中 Claude 评价的差异

README 里的评价整体偏“架构设计视角”，很多判断我认可，例如渲染管线、矩阵模型、Immut + Yjs 的价值、auto-import 负担、测试缺失。

但我会把当前评分压低一些，原因是实际代码状态里有几项更硬的事实：

- 远程协作初始化被注释，不能按“协作已完成”评价。
- 旧状态链路和新状态链路没有彻底切换，残留较多。
- `tsc --noEmit` 无法在 5 分钟内完成，不适合做质量门禁。
- 命令菜单存在会直接触发未实现函数的路径。
- 项目规范与实际文件/样式体系有冲突。

所以我更倾向于把它看作“优秀内核原型 + 待收敛工程系统”，而不是已经成熟的在线设计编辑器。

## 建议路线

### P0：先收敛事实来源

明确唯一主线：建议以 `YState + Immut + Undo` 作为当前事实来源，把旧 `Schema/OperateNode/Operate*` 迁移或删除。不要让两个状态系统继续并存。

同时处理协作：如果要打“多人协作”标签，就恢复 `YSync.init`，补连接状态、重连、离线、awareness 清理和最小双端同步验证；如果暂时不做，就从产品文案里降级。

### P0：建立质量门禁

新增脚本：

```json
{ "typecheck": "tsc --noEmit --pretty false", "test": "vitest run" }
```

然后先解决 `tsc` 超时问题。可以从排除历史死代码、拆出 generated unicode data、减少全局类型污染开始。

### P1：给核心算法补测试

优先级建议：

1. `Immut`：set/insert/delete/next/getPatches/applyImmerPatches。
2. `immut-y`：对象、数组、删除、远端更新、本地更新双向同步。
3. `Matrix` / `MRect`：旋转、缩放、invert、append/prepend、AABB。
4. `Undo`：空栈、client/state/all 三类撤销重做。
5. `HitTest`：矩形、椭圆、多边形、折线边界。

### P1：修掉几个小而硬的运行时问题

- `Undo.undo/redo` 增加 `canUndo/canRedo` guard。
- `InputNum` 允许 `0` 作为合法结束值。
- `HandleNode.wrapInFrame` 要么实现，要么从菜单隐藏。
- `OperateAlign` 改成当前 `SchemaHelper/YState` 链路。
- 补齐 zh i18n 中的 `noun.rect`、`verb.rotate`。
- 修复字体路径警告。

### P2：清理历史代码和规范债

- 移除或迁移 `a.js`、`b.js`、`immut copy 2.ts`、旧 Pixi/`src/shared` 残留。
- 统一 kebab-case 命名。
- 明确 Tailwind 是否保留；如果项目规范坚持 Linaria，就删除 Tailwind 插件、依赖和 class。
- 缩小 auto-import 范围，至少核心业务模块显式 import。

### P2：降低首屏包体

- 首页与编辑器路由动态 import。
- 颜色选择器、文本换行数据、图片/图标面板按需加载。
- 对 `src/editor/render/text-break` 的 Unicode 数据做懒加载或 worker 化评估。

## 分项评分

| 维度         | 评分 | 说明                                          |
| ------------ | ---: | --------------------------------------------- |
| 产品方向     |  8.0 | 类 Figma 工具目标清晰，布局和核心功能方向正确 |
| 渲染内核     |  8.5 | Canvas 优化意识强，有真实复杂画布经验         |
| 几何模型     |  8.0 | Matrix/MRect 方向成熟，适合编辑器长期演进     |
| 数据模型设计 |  7.5 | Immut + Yjs 有价值，但还缺测试和工程收敛      |
| 当前协作能力 |  4.5 | 设计存在，但默认远程同步未启用                |
| 代码一致性   |  5.5 | 新旧链路并存、死代码较多、规范执行不稳定      |
| 类型安全     |  4.0 | strict 配置存在，但完整 typecheck 不可用      |
| 测试与健壮性 |  2.5 | 核心算法无测试，错误边界和日志不足            |
| 可维护性     |  5.5 | 个人可推进，团队接手成本较高                  |

综合评分：6.6/10。

## 最后判断

这个项目最值得保留和继续投入的是三块：`Matrix/MRect` 几何体系、`StageSurface/Elem` 渲染管线、`Immut + Yjs` 状态桥接。它们构成了一个设计编辑器真正难的部分。

最需要尽快处理的是工程收敛：砍掉旧链路、恢复类型检查、补核心测试、明确协作状态。做完这些后，Sigma 的评价会明显上一个台阶。
