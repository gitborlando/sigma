# Refactor Editor Shape Plan

## 1. 用 migration 清除旧 polygon / star 数据

目标：旧文件进入 runtime 前就完成 `polygon` / `star` 到 `Path` 的转换，编辑器运行时不再看到这两种节点。

直接处理：

- 增加 schema migration：`polygon -> Path`
- 增加 schema migration：`star -> Path`
- migration 复用现有点生成 / points 数据，保证转换后视觉尽量一致
- migration 后保存文件只写入 `Path`
- 删除 legacy runtime adapter，不保留运行时兼容分支

验收：

- 打开旧文件后，文档树中不再存在 `polygon` / `star`
- 旧 polygon / star 转换后可以正常显示、选中、变换、导出
- 保存后的文件不会再写回 `polygon` / `star`

## 2. 删除所有 polygon / star 特定入口

目标：不再提供任何面向 `polygon` / `star` 的专用创建、编辑、导出入口。

直接处理：

- 删除 toolbar / stage create 中的 polygon / star 专用工具
- 删除 schema creator 中的 polygon / star 创建方法
- 不新增 `createPolygonPath` / `createStarPath`
- 删除或隔离 `createRegularPolygon` / `createStarPolygon`，只允许 migration 内部使用
- 删除 geometry panel 中的 `sides`、`pointCount`、`innerRate` 等字段
- 删除命令、快捷键、菜单、测试夹具里的 polygon / star 专用入口

验收：

- 用户界面中没有 polygon / star 专用入口
- 业务代码不能再通过 creator 新建 polygon / star
- repo 中 polygon / star 的剩余引用只出现在 migration 或历史兼容测试里

## 3. 让 Path 承接所有复杂图形能力

目标：复杂图形只通过通用 `Path` 能力存在，不再通过 named shape 入口存在。

直接处理：

- 保留并强化通用 Path 创建入口
- render 只走 Path 渲染逻辑
- hit-test 只走 Path 命中逻辑
- selection / bounds / mrect 只走 Path 几何逻辑
- transform 只更新 Path 数据，不回写任何 shape 参数
- export 把转换后的旧图形作为普通 Path 导出

验收：

- 旧 polygon / star migration 后行为与普通 Path 一致
- mixed selection 中只出现 Path 支持的通用几何字段
- render / hit-test / transform / export 不再有 polygon / star 主流程分支

## 4. 清理 schema 和 core 分支

目标：让 `polygon` / `star` 从 active schema 和 core 主代码路径中消失。

直接处理：

- 从 active node union 中移除 `polygon` / `star`
- 从核心类型导出中移除 `polygon` / `star`
- 从 render drawer / hit-test / transform / geometry service 中删除对应分支
- 从文档、示例、测试数据中移除新建 `polygon` / `star` 的描述
- 为 migration 保留最小 legacy 类型定义，并放入 compat / migration 区域

验收：

- active schema 不再包含 `polygon` / `star`
- core 主流程没有 polygon / star 分支
- 只有 migration 层还知道旧 `polygon` / `star` 数据结构
