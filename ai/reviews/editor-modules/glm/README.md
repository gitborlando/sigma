# Editor 模块架构 Review（GLM）

评价时间：2026-06-18
评价范围：`app/web/src/editor/**`（不含 `packages/`）
评价视角：跳出当前实现，从「作者写这个模块的意图」+「架构层是否成立」出发，做客观判断。

---

## 评价背景与立场

这份 review 不打算逐行挑 bug，而是回答一个问题：**每个模块承担的角色是否合理，边界是否清晰，意图有没有被实现方式稀释掉。**

Sigma 的 editor 是一个自研矢量设计编辑器内核，技术栈是 Canvas 2D + MobX + Yjs + Immut(自研) + React(工具型 UI)。它的核心难度不在某一段代码，而在于：状态(Source of Truth)、渲染(Rendering)、交互(Interaction)、协作(Collaboration)、撤销(Undo/Redo) 这五件事彼此咬合，任何一处抽象选错都会在别处偿还。

因此本评价的重心放在「抽象选型」和「模块边界」，而不是「这段循环能不能再快一点」。

---

## 模块地图

```
editor/
├── editor/      # 顶层编排：生命周期、命令、设置、undo 服务、img、mock
├── y-state/     # 数据源：Yjs + Immut 镜像 + 客户端状态 + 协作 awareness
├── schema/      # schema 工厂、遍历器、版本迁移
├── handle/      # 高层「领域操作」：增删节点 / 页面 / 选区
├── operate/     # 面向右键面板的「属性编辑」服务：fill/stroke/shadow/align/geometry/text
├── render/      # Canvas 渲染：surface(调度) + scene(elem 树) + elem + draw + text-break
├── stage/       # 交互与画布工具：viewport / interact / select / create / move / transformer / grid / cursor
├── math/        # 几何原语：matrix / mrect / point / bezier
└── utils/       # editor 内部纯函数：get(选区派生) / misc(吸附/像素对齐)
```

按「数据流方向」归类，可以看成三层：

| 层         | 模块                                  | 角色                                   |
| ---------- | ------------------------------------- | -------------------------------------- |
| **数据层** | `y-state` / `schema`                  | 唯一事实源 + schema 形状与迁移         |
| **领域层** | `handle` / `operate`                  | 把「用户意图」翻译成「对数据层的事务」 |
| **表现层** | `render` / `stage` / `math` / `utils` | 把数据画出来 + 把人/指针的输入翻译回去 |

这份分层是成立的，也是 Sigma 区别于普通前端 demo 的地方。下面逐个模块评价，并在最后一篇做整体判断。

---

## 评分摘要

> 评分以「架构意图达成度」为主，「当前工程整洁度」为辅。5 = 该层抽象选型对、且实现基本收敛；偏低主要来自新旧链路并存、样板重复、边界靠纪律维护。

| 模块      | 评分     | 一句话                                                          |
| --------- | -------- | --------------------------------------------------------------- |
| `math`    | 8.5 / 10 | 项目最干净的一层，Matrix/MRect 抽象选对了，是真正的资产         |
| `render`  | 7.5 / 10 | 渲染调度和脏矩形/分片是真功夫，但 surface 承担过重              |
| `schema`  | 7.0 / 10 | creator+helper+migration 三件套清晰，traverse 两套并存是债      |
| `stage`   | 7.0 / 10 | interact 状态机思路对，transformer 数学扎实，select 偏厚        |
| `y-state` | 6.5 / 10 | Immut+Yjs 镜像方向有价值，但双写语义脆弱、协作默认关            |
| `handle`  | 6.5 / 10 | 领域操作方向对，但 track 散落、select 混进 client-undo 让它不纯 |
| `editor`  | 6.0 / 10 | 作为编排层合格，但 command + setting + undo 三种风格混在一起    |
| `operate` | 5.5 / 10 | 三个 fill/stroke/shadow 近乎复制粘贴，且夹着旧的 immui 残骸     |
| `utils`   | 6.0 / 10 | 太薄，更像随手放的杂项目录，没有承担起「领域纯函数」的角色      |

整体（editor 文件夹）：**7.0 / 10**。核心抽象选型（矩阵化几何、Immut+Yjs 镜像、track-as-commit、Canvas 分层渲染）方向都对，是「思路很强、工程收敛未完成」的状态。最大的结构性债不是某个模块写错了，而是 **新旧两套状态/操作链路并存**，以及 **大量靠调用方纪律维持的隐式契约**（track、untrack、register 顺序、双写时机）。

---

## 评价方式说明

每个模块文档统一结构：

1. **意图**：作者想让它解决什么问题（尽量从代码和 `ai/notes` 推断，不臆测）。
2. **架构画像**：它现在怎么实现，关键抽象是什么。
3. **成立的部分**：哪些选型是对的，值得保留。
4. **问题与风险**：哪些地方抽象被稀释、边界不清、或埋了隐性不变量。
5. **方向建议**：不推翻重写的前提下，往哪收。

评价会尽量引用具体文件和符号，便于核对。
