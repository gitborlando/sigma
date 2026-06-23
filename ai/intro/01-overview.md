# 01 · 项目总览

## 一句话定位

**Sigma 是一个类 Figma 的在线矢量设计编辑器**，由单人开发，基于 Canvas 2D 自研渲染管线，使用 Yjs 实现实时多人协同。

它不是调用一个现成的画布库（如 Fabric.js、Konva），而是**从零搭建了完整的节点数据模型、几何计算、渲染管线、协同同步**。理解它的价值也在于此：你可以把它当作一份「如何用 Web 技术从底层造一个设计工具」的完整参考实现。

在线演示：<https://sigma.gitborlando.com>

---

## 它能做什么

一个设计编辑器的核心能力 Sigma 都具备：

- **矢量图形绘制**：矩形、椭圆、多边形、星形、直线、自由路径（path）、文字、画板（frame）、编组（group）
- **变换**：移动、缩放、旋转、翻转
- **样式**：填充（纯色 / 线性渐变 / 图片）、描边、阴影、模糊、不透明度、圆角
- **图层管理**：左侧图层面板，支持多级嵌套、重排层级、锁定 / 隐藏
- **对齐与分布**：右键菜单和右侧属性面板的对齐操作
- **撤销 / 重做**：基于 patch 的细粒度 undo / redo
- **多人协同**：实时光标、选择同步、跟随视角（observe）
- **文件管理**：首页文件列表、新建、持久化到云端
- **栅格辅助**：标尺、网格、参考线

---

## 技术栈一览

### 核心技术

| 领域       | 技术                                             | 用途                                               |
| ---------- | ------------------------------------------------ | -------------------------------------------------- |
| 渲染       | **Canvas 2D**（原生 `CanvasRenderingContext2D`） | 自绘所有图形，非 SVG / WebGL                       |
| 框架       | **React 18**                                     | UI 视图层（仅 view 层，不碰 Canvas 内容）          |
| 状态       | **MobX**                                         | Service 内部的响应式状态（选择、视口、面板状态等） |
| 协同       | **Yjs** + **Hocuspocus**                         | CRDT 数据同步 + WebSocket provider                 |
| 持久化     | **IndexedDB**（`y-indexeddb`）                   | 本地离线缓存                                       |
| 后端       | **Supabase**（PostgreSQL）                       | 文件元数据存储                                     |
| 对象存储   | **腾讯云 COS**                                   | 设计文件（zip 包）存储                             |
| 校验       | **Zod**                                          | Schema 运行时校验                                  |
| 不可变更新 | **Immer**                                        | 产生可追踪的 patches                               |

### 自研 / 内部包（monorepo）

仓库是 pnpm monorepo，内部包以 `@gitborlando/*` 或 `@sigma/*` 命名：

| 包                                       | 作用                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@gitborlando/toolkit`                   | 通用工具：`Disposer`（副作用回收）、`Traverser`（树遍历）、`browser`（Dragger / Wheeler） |
| `@gitborlando/mobx-undo`                 | 基于 MobX + travels 的撤销重做引擎                                                        |
| `@gitborlando/vite-plugin-nested-assets` | Vite 插件：把资源目录扫描成嵌套的 typed assets map                                        |
| `@sigma/utils`                           | 项目通用工具：`defu`、`storage`、`zod`、`common`                                          |
| `@sigma/api-types`                       | Supabase 数据库表类型（由 `supabase gen types` 生成）                                     |

外部发布的 `@gitborlando/*`：

| 包                    | 作用                                                  |
| --------------------- | ----------------------------------------------------- |
| `@gitborlando/geo`    | 几何计算库：`XY`、`AABB`、`OBB`、`Angle` 等           |
| `@gitborlando/utils`  | 通用工具函数（`clone`、`getSet`、`iife`、`miniId` …） |
| `@gitborlando/signal` | 极简信号（Signal）实现，用于事件派发                  |
| `@gitborlando/widget` | UI 组件库                                             |

### 构建与工程

- **构建**：Vite 7
- **包管理**：pnpm 9（workspace）
- **语言**：TypeScript（strict）
- **样式**：**Linaria**（CSS-in-JS，编译期提取）+ 少量 Tailwind utility。**不使用 tailwind 作为主力**，而是用 Linaria 的 `css` / `classes` 写组件级样式（见 [AGENTS.md](../../AGENTS.md) 约定）。
- **图标**：lucide-react（线性图标）
- **自动导入**：`unplugin-auto-import` 把 `G`、`css`、`observer`、`XY`、`Matrix` 等全局符号自动注入，无需手动 import（见 `apps/web/auto-imports.d.ts`）
- **国际化**：i18next

---

## 单仓双包结构

```
sigma/
├── apps/
│   └── web/              ← 唯一的应用（@sigma/web），整个编辑器都在这里
├── packages/             ← 内部库
│   ├── toolkit/          ← Disposer / Traverser / browser
│   ├── mobx-undo/        ← 撤销重做引擎
│   ├── sigma-utils/      ← defu / storage / zod / common
│   ├── api-types/        ← Supabase 类型
│   └── nested-assets/    ← Vite 资源插件
├── types/
│   └── schema/           ← 全局 Schema 类型定义（S / S1 / S2 命名空间）
├── ai/                   ← AI 协作产物（本文档就在这里）
└── AGENTS.md             ← AI 代理工作规范
```

关键认知：**整个编辑器的产品代码几乎都在 `apps/web/src` 下**，`packages/` 是可独立复用的内部库。`types/schema/*.d.ts` 是跨包共享的数据模型类型（通过 `tsconfig` 的 path alias 全局可见）。

---

## 一个重要区分：editor vs view

在 `apps/web/src` 下，代码严格分为两层：

```
src/
├── editor/    ← 编辑器内核（与 React / DOM 无关的纯逻辑）
└── view/      ← React UI 层（负责把内核状态渲染成界面）
```

- **`editor/`**：数据模型、几何计算、渲染管线、协同、交互逻辑。这一层理论上可以脱离 React 运行（事实上它内部用了一个**自定义 React Reconciler** 把 widget 渲染到 Canvas Elem 树上，但那是另一回事）。
- **`view/`**：React 组件、页面、样式、用户交互入口。它**订阅** editor 的状态来更新自己，并**调用** editor 的方法来响应用户操作。

这个边界非常重要，是理解整个项目代码组织的钥匙。后面 [`02-architecture.md`](./02-architecture.md) 会详细展开。

---

## 谁在用这个项目

- **作者本人**：作为个人主力设计工具长期使用和迭代
- **读者你**：理解如何从零造一个 Web 端设计编辑器

项目体量不算巨大（核心内核约 50+ 个 service 文件），但概念密度高。建议按 README 推荐的路线顺序阅读，不要跳。

---

## 下一站

→ [`02-architecture.md`](./02-architecture.md) 看整体架构与分层模型。
