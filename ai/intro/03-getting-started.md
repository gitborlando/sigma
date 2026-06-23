# 03 · 上手指南与目录结构

这篇解决两个问题：① 怎么把项目跑起来；② 每个目录里装了什么。

---

## 环境准备

- **Node.js**：建议 18+（项目用了较新的 Vite 7 / TS 5.9）
- **包管理器**：**pnpm 9**（仓库 `package.json` 锁定 `packageManager: "pnpm@9.12.2"`）
- **平台**：开发在 Windows，但代码是标准的跨平台 Web 项目

安装 pnpm（如未安装）：

```bash
npm install -g pnpm@9
```

## 克隆与安装

```bash
git clone <repo-url> sigma
cd sigma
pnpm install
```

由于是 monorepo，`pnpm install` 会自动处理 workspace 依赖（`@gitborlando/toolkit`、`@sigma/utils` 等内部包会通过 `workspace:*` 链接）。

## 启动开发服务器

```bash
pnpm dev        # 等同于 pnpm --filter @sigma/web dev
```

这会用 Vite 启动开发服务器，默认 `http://localhost:5173`（`vite.config.ts` 里设了 `server.open: true`，会自动开浏览器）。

### 其他常用脚本（根目录 `package.json`）

| 命令                      | 作用                                                   |
| ------------------------- | ------------------------------------------------------ |
| `pnpm dev`                | 启动 web 开发服务器                                    |
| `pnpm build`              | 构建生产包                                             |
| `pnpm preview`            | 预览生产构建                                           |
| `pnpm typecheck`          | 全 workspace 类型检查（`pnpm -r typecheck`）           |
| `pnpm typecheck:web`      | 只检查 web                                             |
| `pnpm re-base:main`       | 基于 origin/main 做 rebase                             |
| `pnpm gen:supabase-types` | 重新生成 Supabase 数据库类型（需要 supabase CLI 登录） |

## 访问入口

- `/` → 首页（文件列表，`HomeComp`）
- `/fileId/:fileId` → 编辑器（`EditorComp`）—— 真正的核心
- `/fileId/mock` → 加载内置 mock 数据（用于离线开发，见 `y-state.ts` 的 `initSchema`）
- `/test` → 测试页

路由定义在 `apps/web/src/view/router.tsx`。

---

## 应用启动流程（从入口到编辑器可用）

理解这条链路对调试很重要：

```
index.html
   │ 加载
   ▼
src/index.ts                         ← 全局入口
   │ enablePatches()  （开启 Immer patch）
   │ configure({ enforceActions: 'never' })  （放宽 MobX）
   │ ReactDOM.render(<App />)
   ▼
view/app.tsx  App                    ← 根组件
   │ 包 QueryClientProvider / ContextMenu / Uploader
   │ 挂 RouterProvider
   ▼
view/router.tsx                      ← 路由
   │ /fileId/:fileId → <EditorComp />
   ▼
view/editor/index.tsx  EditorComp    ← 编辑器视图
   │ 1. Editor.init()                ← 初始化内核（注册所有 service 副作用）
   │ 2. suspend(YState.initSchema)   ← 加载文件数据（zip 下载→解压→迁移→绑定 Y.Doc）
   │ 3. suspend(StageSurface.initTextBreaker)  ← 初始化文字断行（加载 Unicode trie）
   │ 渲染布局：Header / LeftPanel / Stage / RightPanel
   ▼
内核就绪，渲染开始
```

注意 `suspend()` 来自 `suspend-react`：它让数据加载变成「声明式挂起」，React 会显示 `<Loading />` fallback 直到加载完成。所以 `EditorComp` 被 `withSuspense` 包裹。

---

## 完整目录结构

```
sigma/
├── apps/
│   └── web/                          ← @sigma/web，唯一应用
│       ├── index.html
│       ├── vite.config.ts            ← Vite 配置（含 Linaria / auto-import / nested-assets）
│       ├── auto-import.ts            ← 自动导入配置
│       ├── auto-imports.d.ts         ← 自动生成的全局类型（G/css/observer/XY...）
│       └── src/
│           ├── index.ts              ← 应用入口（ReactDOM.render）
│           ├── vite-env.d.ts
│           ├── editor/               ← ★ 编辑器内核（与 React 无关）
│           ├── view/                 ← ★ React UI 层
│           ├── global/               ← 全局服务（SDK / 后端 / 上传）
│           └── utils/                ← 应用级工具（color / common / immut 桥接）
│
├── packages/                         ← 内部库
│   ├── toolkit/                      ← Disposer / Traverser / browser(Dragger/Wheeler)
│   ├── mobx-undo/                    ← 撤销重做引擎
│   ├── sigma-utils/                  ← defu / storage / zod / common
│   ├── api-types/                    ← Supabase 数据库类型
│   └── nested-assets/                ← Vite 资源插件
│
├── types/
│   ├── schema/                       ← ★ 全局 Schema 类型（S / S1 / S2）
│   │   ├── schema.d.ts               ← 对外命名空间 S
│   │   ├── schema-v1.d.ts            ← S1（旧版，仅供迁移）
│   │   ├── schema-v2.d.ts            ← S2（当前版）
│   │   └── updates.md                ← 版本变更记录
│   └── utils.d.ts
│
├── ai/                               ← AI 协作产物
│   ├── instructions/                 ← 指示规范（ui.md）
│   ├── notes/                        ← 深度笔记
│   ├── reviews/                      ← 代码评审
│   ├── tasks/                        ← 任务
│   └── docs/                         ← ★ 本文档集合
│
├── AGENTS.md                         ← AI 代理工作规范（中文）
├── package.json                      ← 根 workspace 配置
├── pnpm-workspace.yaml               ← workspace 声明
└── tsconfig.base.json                ← 共享 TS 配置
```

---

## editor/ 内核目录详解

这是最常打交道的目录，重点展开：

```
src/editor/
├── index.ts                  ← EditorService 总装
│
├── core/                     ← 内核基础设施
│   ├── command.ts            ← EditorCommand：快捷键 + 右键命令
│   ├── setting.ts            ← EditorSetting：全局设置（devMode 等）
│   └── undo.ts               ← Undo：撤销重做（结合 Y.UndoManager + MobxUndo）
│
├── schema/                   ← Schema 操作（类型在 types/schema/）
│   ├── creator.ts            ← SchemaCreator：节点工厂
│   ├── helper.ts             ← SchemaHelper：类型判断
│   ├── migration.ts          ← migrationSchema：版本迁移
│   └── traverse.ts           ← createSchemaTraverse：树遍历
│
├── y-state/                  ← 数据 / 协同
│   ├── y-state.ts            ← YState：读写 Schema 的唯一入口
│   ├── y-sync.ts             ← YSync：Hocuspocus WebSocket
│   └── y-clients.ts          ← YClients：协同用户状态
│
├── geometry/                 ← 几何计算
│   ├── matrix.ts             ← Matrix：2D 仿射矩阵（a/b/c/d/tx/ty）
│   ├── mrect.ts              ← MRect：矩阵矩形（width/height + matrix）
│   ├── point.ts              ← 点 / 正多边形 / 星形 / 直线生成
│   ├── hit-test.ts           ← 命中测试
│   ├── bezier/               ← 贝塞尔曲线计算
│   └── base.ts               ← 数学工具（max/min/round/abs...）
│
├── render/                   ← 渲染
│   ├── scene.ts              ← StageScene：Elem 树
│   ├── elem.ts               ← Elem：渲染节点（缓存派生量）
│   ├── draw.ts               ← ElemDrawer：实际绘制
│   ├── surface.ts            ← StageSurface：Canvas 管理 + 脏矩形
│   ├── react/reconciler.ts   ← 自定义 React Reconciler（挂 widget 到 Elem）
│   ├── text-break/           ← 文字断行（Unicode grapheme / line break）
│   └── widget/               ← 装饰元素（选择框、变换手柄、光标）
│
├── stage/                    ← 舞台（视口 + 交互 + 工具）
│   ├── viewport.ts           ← StageViewport：缩放 / 平移 / 视口 AABB
│   ├── cursor.ts             ← StageCursor：鼠标光标样式
│   ├── interact/             ← ★ 交互状态机
│   │   ├── interact.ts       ← StageInteract：select/move/create 模式切换
│   │   ├── select.ts         ← StageSelect：选择
│   │   ├── move.ts           ← StageMove：拖动 / 变换
│   │   ├── create.ts         ← StageCreate：创建图形
│   │   └── drag.ts           ← StageDrag：拖拽辅助
│   └── tools/                ← 辅助绘制工具
│       ├── grid.ts           ← 网格
│       ├── ruler.ts          ← 标尺
│       ├── guide.ts          ← 参考线
│       └── transformer.ts    ← 变换控制器
│
├── handle/                   ← 业务句柄
│   ├── select.ts             ← HandleSelect：选中状态（可撤销）
│   ├── node.ts               ← HandleNode：节点增删改
│   └── page.ts               ← HandlePage：页面管理
│
├── operate/                  ← 高层操作
│   ├── align.ts              ← OperateAlign：对齐分布
│   ├── fill.ts               ← OperateFill：填充编辑（多选合并）
│   ├── geometry.ts           ← OperateGeometry：几何变换
│   └── points.ts             ← OperatePoints：路径点编辑
│
├── workbench/                ← 工作台状态
│   └── layer-panel/          ← 图层面板（展开状态、节点树）
│
└── utils/                    ← 内核工具
    ├── get.ts                ← 各种 getter（getSelectIdList / getZoom...）
    └── misc.ts               ← 杂项（Raf / snapGridRoundXY...）
```

---

## view/ UI 层目录详解

```
src/view/
├── app.tsx                   ← 根组件
├── router.tsx                ← 路由
├── app.css                   ← 全局样式
│
├── editor/                   ← 编辑器界面（核心）
│   ├── index.tsx             ← EditorComp 布局
│   ├── header/               ← 顶栏（协作 / 历史 / 缩放 / 设置 / dev 快照）
│   ├── left-panel/           ← 左侧（图层面板：页面列表 + 节点树）
│   ├── right-panel/          ← 右侧（属性面板：对齐 / 几何 / 填充 / 描边 / 阴影）
│   └── stage/                ← 画布区（surface / ruler / cursor / transform / marquee）
│
├── pages/                    ← 页面
│   ├── home/                 ← 首页（文件列表）
│   └── test.tsx              ← 测试页
│
├── component/                ← 通用 UI 组件
│   ├── btn.tsx               ← Btn 按钮（solid/outline/ghost）
│   ├── grid.tsx              ← ★ G/Grid 布局组件（最常用）
│   ├── input-num.tsx         ← 数字输入
│   ├── popover-card.tsx      ← 气泡卡片
│   ├── segments.tsx          ← 分段控件
│   ├── menu.tsx              ← 菜单
│   ├── context-menu.tsx      ← 右键菜单
│   ├── uploader.tsx          ← 上传
│   ├── kbd.tsx               ← 快捷键提示
│   ├── loading.tsx
│   └── shadcn/               ← 基于 shadcn 风格的组件
│
├── hooks/                    ← React hooks
├── i18n/                     ← 国际化（i18next）
├── styles/                   ← 样式（color / classes / theme）
└── assets/                   ← 静态资源（svg / png，由 nested-assets 插件扫描）
```

---

## 几个值得特别注意的点

### 1. 全局自动导入（auto-import）

很多符号**不需要手动 import**，它们由 `unplugin-auto-import` 全局注入。看 `apps/web/auto-imports.d.ts` 就知道有哪些。常见的：

- `G`、`Grid`、`C`（布局组件）
- `css`、`cx`、`classes`（Linaria 样式）
- `observer`、`Observer`（mobx-react-lite）
- `XY`、`AABB`、`OBB`、`Angle`、`Matrix`（几何）
- `action`、`autorun`、`computed`、`observable`、`makeObservable`（MobX）
- `autoBind`、`memo`、`forwardRef`、`lazy`、`useMemo`、`useEffect`（React / auto-bind）
- `T`（类型断言工具）、`isDEV` / `isPROD`
- `Y`（yjs）

读代码时如果看到「没 import 却能用」的符号，去 `auto-imports.d.ts` 查。

### 2. `G` 组件是布局主力

```tsx
<G horizontal='auto 1fr auto'>  {/* 三列 grid */}
<G vertical='auto 1fr'>          {/* 两行 grid */}
<G horizontal center>            {/* 水平居中 */}
```

它本质是一个 `<div>` + CSS Grid 封装，见 `view/component/grid.tsx`。整个编辑器的布局都是用 `G` 搭的。

### 3. 路径别名

`vite.config.ts` 配了两个别名：

- `src` → `apps/web/src`
- `types` → 仓库根的 `types/`

所以你会看到 `import { ... } from 'src/editor/...'` 这样的绝对路径导入。

### 4. devMode

`EditorSetting` 有个 `devMode` 开关。打开后，右键菜单和命令里会多出 `print schema`、`print element` 等调试命令，header 也会有 dev 快照按钮。开发时很常用。

---

## 下一站

→ [`04-data-flow.md`](./04-data-flow.md) 进入核心：数据是怎么流动的。
