# Sigma 项目文档

这是一套关于 **Sigma** 的完整文档，面向「完全不懂这个项目的人」。按顺序读完，就能从零掌握整个项目的定位、架构、数据流与代码组织方式。

> Sigma 是一个单人开发的**类 Figma 在线矢量设计编辑器**，基于 Canvas 2D 自研渲染管线，使用 Yjs 实现协同。
> 在线演示：<https://sigma.gitborlando.com>

---

## 我该从哪开始读

根据你的背景选一条路线：

### 路线 A：我是新人，想快速理解「这是什么」

1. [`01-overview.md`](./01-overview.md) — 项目总览（是什么、能做什么、技术栈）
2. [`02-architecture.md`](./02-architecture.md) — 整体架构与分层（一张图看懂）
3. [`03-getting-started.md`](./03-getting-started.md) — 如何跑起来 / 目录结构

### 路线 B：我是开发者，要改代码

1. [`02-architecture.md`](./02-architecture.md) — 分层与模块边界
2. [`04-data-flow.md`](./04-data-flow.md) — ⭐ 核心数据流（改任何东西前必读）
3. [`05-schema.md`](./05-schema.md) — 数据模型 Schema 定义
4. [`06-render.md`](./06-render.md) — Canvas 渲染管线
5. [`07-collaboration.md`](./07-collaboration.md) — Yjs 协同机制

### 路线 C：我要做 UI / 交互

1. [`03-getting-started.md`](./03-getting-started.md) — 目录结构（区分 `editor/` 与 `view/`）
2. [`08-ui-and-interact.md`](./08-ui-and-interact.md) — UI 层与交互系统
3. [`04-data-flow.md`](./04-data-flow.md) — 数据如何驱动 UI

---

## 文档索引

| 文档                                          | 主题      | 一句话                                               |
| --------------------------------------------- | --------- | ---------------------------------------------------- |
| [01-overview](./01-overview.md)               | 项目总览  | Sigma 是什么、技术栈一览                             |
| [02-architecture](./02-architecture.md)       | 架构分层  | Service / Schema / YState / Scene / Surface 五层模型 |
| [03-getting-started](./03-getting-started.md) | 上手指南  | 环境准备、目录结构、启动流程                         |
| [04-data-flow](./04-data-flow.md)             | ⭐ 数据流 | 一次「改颜色」操作如何走完全程                       |
| [05-schema](./05-schema.md)                   | 数据模型  | Schema 的形状、节点类型、迁移机制                    |
| [06-render](./06-render.md)                   | 渲染管线  | Canvas 2D 自绘、脏矩形、Elem 树                      |
| [07-collaboration](./07-collaboration.md)     | 协同      | Yjs + Immut 双层状态镜像                             |
| [08-ui-and-interact](./08-ui-and-interact.md) | UI 与交互 | React 视图、交互状态机、Service 模式                 |

---

## 几个核心概念（先记住，后面会反复出现）

这几个词贯穿所有文档，先建立印象：

- **Schema**：整个设计文件的 JSON 数据结构，是唯一真相源（source of truth）。所有节点、属性都存在里面。
- **YState**：管理 Schema 的服务。它同时维护 `Y.Doc`（协同权威源）和 `Immut`（本地镜像）两层。
- **Immut**：一个可追踪变更的本地状态对象，渲染层订阅它。
- **Scene**：把 Schema 数据转换成的 **Elem 树**（渲染用的节点树），每个 Elem 对应一个视觉元素。
- **Surface**：Canvas 画布管理器，负责真正的 `ctx.fillRect` 绘制、脏矩形重绘。
- **Service 模式**：整个编辑器由若干个「服务类」组成，每个服务 `subscribe()` 后返回 disposer，由 `Editor` 统一管理生命周期。

---

## 配套阅读

仓库内已有的 AI notes（针对具体问题的深度笔记）：

- [`ai/notes/y-state-mirror-sync.md`](../notes/y-state-mirror-sync.md) — YState 双层镜像同步的精确语义
- [`ai/notes/editor-lifecycle-effects.md`](../notes/editor-lifecycle-effects.md) — 编辑器副作用与生命周期管理
- [`ai/notes/selection-replay-source.md`](../notes/selection-replay-source.md) — 选择状态的回放来源
- [`ai/instructions/ui.md`](../instructions/ui.md) — UI 设计风格规范

本文档集合与上述 notes 互补：notes 解决「为什么这么设计」的细节，本集合解决「整体是什么」的认知搭建。
