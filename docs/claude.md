# Sigma 项目 Review

- 范围：`main` 分支 @ `6873a7d2`（Refactor home authentication state and login dialog），整个 monorepo，约 2.2 万行 TS
- 方式：读代码 + 运行 typecheck / test。代码完全没改动
- 记号：**[已复核]** 表示我亲自读代码确认过；没标记的条目来自分模块的深度阅读，都带有 `文件:行号`，可以逐条核查

---

## 一、总评

**这是一个技术野心很大、核心底子扎实，但"产品闭环"和"工程保障"明显欠账的单人项目。**

对一个单人项目来说，自研的部分相当硬核：

- Canvas2D 渲染管线：脏区重绘、分片渲染、平移位移复用
- 自定义 React reconciler，用来画覆盖层
- UAX#14 文本断行
- `y-plain`：把 Yjs 投影成不可变状态
- `mobx-undo`
- 作用域 DI 容器

架构分层的方向也是对的：

- Yjs 作为唯一数据源
- 编辑器是一个可销毁的作用域容器
- api 契约层和 cloudbase 适配层分开

问题集中在三处：

1. **主流程有断点**：Demo、导入、换浏览器打开文件这几条路径都会卡在骨架屏。
2. **撤销/重做的模型比较脆弱**：三套栈靠约定对齐，很多场景下会错位。
3. **几乎没有工程护栏**：没有 lint，没有 CI 校验，web 端零测试，main 上的 typecheck 是红的。

| 维度         | 评分 (10) | 一句话                                                              |
| ------------ | --------- | ------------------------------------------------------------------- |
| 架构设计     | 7.5       | 分层清楚，DI 作用域思路好，但 Global 和 Editor 的作用域有泄漏       |
| 核心技术深度 | 8         | 渲染、协同、撤销都是自研，有不少巧思                                |
| 正确性       | 5         | 不少高频操作有确定性 bug（删除、撤销、文本、命中）                  |
| 性能         | 6         | 渲染策略不错，但数据层每次变更都在 clone / deepEqual，命中测试 O(n) |
| 工程化       | 3.5       | 无 lint、无 CI、web 零测试、typecheck 失败、依赖冗余                |
| 安全         | 6         | 无明显 XSS；凭证硬编码，数据隔离完全依赖数据库规则                  |
| 可维护性     | 6         | 代码风格统一，但 auto-import 隐式全局多，规范文档和实际不符         |

---

## 二、做得好的地方

- **`packages/di-service`**：
  - `ScopedDI` 的父级回退，加上 `Service.effect` 统一释放，让 `Editor` 可以按会话创建和销毁（`view/editor/index.tsx`）。
  - `docs/suspense-editor-instance-mismatch.md` 把 Suspense 和实例错配的坑讲得很清楚，`withPrepare` 是正确的解法。
- **`packages/y-plain`**：
  - 不可变投影 + 结构共享，路径带类型，事务内先应用本地补丁、再对 observe 事件去重。
  - 有 13 个测试用例，全部通过。
- **`packages/mobx-undo`**：客户端状态按切片注册，支持 `archive` / `rebase`，并且断言必须在编辑前注册。
- **`render/pipeline.ts`**：
  - 脏区用的是 paint rect（含阴影、描边、文本溢出），再加抗锯齿 padding。
  - 平移是整屏位移，并累积亚像素误差。
  - 分片渲染以指针位置为中心优先绘制。
- **`render/elem/drawer.ts`**：inner/outer 描边用 evenodd 裁剪加双倍线宽实现，支持扇形和环形，贝塞尔展平后做命中测试。
- **`render/react/reconciler.ts`**：覆盖层用 React 声明式写，和场景层分开在两张 canvas 上。
- **`transformer.ts:40-61`**：多选等比缩放时保留锚点和翻转方向。
- **契约层与适配层分离**：`@sigma/api`（zod 类型 + 抽象类）和 `@sigma/cloudbase`（实现）通过 `setupAPIImplements` 注入，以后可以换后端。
- **i18n**：`t()` 读的是 mobx observable，切换语言是响应式的，实现很简洁。

---

## 三、关键问题（按优先级）

### P0：主流程断点 / 数据丢失

1. **文件打不开，一直停在骨架屏** [已复核]
   - `view/editor/index.tsx:42` 调用 `session.setupFile(fileId)` 时没传 doc，只能依赖 IndexedDB 里已有的数据。
   - 本地没有这个文件时，`session.ts:51` 读 `doc.meta.pageIds` 会抛 TypeError，iife 没有 catch，页面永远停在骨架屏。
   - 触发场景：
     - 首页 Demo 跳到 `/fileId/mock`（`pages/home/header.tsx:58`）；
     - 导入文件；
     - 换浏览器或换设备打开同一个文件。
   - `global/file.ts:56` 的 `loadFile`（含 mock 和 zip 导入）**全仓库没人调用**。
   - 根本原因：云端只存了文件元数据，文档内容只存在本地 IndexedDB，没有拉取通道。
2. **删除失败也清本地数据** [已复核]
   - `global/file.ts:52-53` 用 `tryCatch` 吞掉服务端错误，然后照样 `clearData()`。
   - 结果：本地文档已经丢了，列表里却还有这个文件。
3. **删除首页后选中已删除的页面** [已复核]
   - `action/page.ts:33-41` 里的 `pageIds` 是事务前的不可变快照。
   - 删除第一页后，`selectPage(pageIds[0])` 选中的正是被删的那一页。
   - 被删页面的子孙节点留在 `graphs` 里，成了孤儿。
4. **删除带子节点的 frame/group 会打断分发**
   - `workbench/layer/node-tree.ts:57` 处理 `childIds` 补丁时，调用 `isPageById → findGraph`，此时 group 已经被删，于是抛错（`doc/finder.ts:30` 找不到就 throw，[已复核]）。
   - 后果：
     - `y-doc.ts:94` 的 `distribute` 中断，渲染补丁和 `reportChanged` 都没执行；
     - 异常冒出 `transact`，`node.ts:68` 的 `undo.track` 没执行，撤销栈错位。
5. **字间距被当成最大行数** [已复核]
   - `render/elem/drawer.ts:250` 把 `letterSpacing` 传进了 `breakText(text, maxWidth, style, maxLines)` 的第四个参数。
   - 只要字间距大于 0，文本就会被截成 N 行并加省略号。

### P1：撤销与交互正确性

6. **撤销模型错位**
   - `action/undo.ts` 维护自己的栈，默认"一次 `track` 对应 `Y.UndoManager` 一项、travels 一项"。下面几种情况会打破这个对应：
     - **没有变更也 track**：空选区时按 Del 或 Ctrl+]（`command.ts` 没设 `when`）；连按两次 Ctrl+A。
     - **有变更却没 track**：`transformer.ts:154` 按住 alt 但不拖动，会复制出副本，但不入栈。
     - **一次操作被拆成两项**：拖拽中途停顿超过 `captureTimeout`（500ms），yUndo 会拆成两项。
     - **上限不一致**：travels 的 `maxHistory` 是 100，自定义栈没有上限。
   - 一旦错位，Ctrl+Z 撤掉的就是另一个操作。
   - 建议：以 `Y.UndoManager` 的 `stack-item-added` / `stack-item-popped` 事件为唯一真相，把客户端状态放进 `stackItem.meta`，删掉自定义栈。
7. **撤销后选区悬空**
   - alt 拖拽复制只按 `'state'` 记录（`transformer.ts:186`）。撤销后副本被删，选区仍指向它，`effect.ts:380` 等处会抛 TypeError。
   - `undo.ts:108` 撤销时先恢复选区、再恢复文档，所以撤销删除操作时也会短暂出现悬空选区。
8. **`statePatches` 只存不用** [已复核]
   - `undo.ts:71` 每次 track 都会把 `yDoc.getPatches()` 存进栈。这些 patch 已经在 `y-doc.ts:96` 被 `clone` 过一遍。
   - 重放走的是 `Y.UndoManager`，这些 patch 只有 dev 工具会读。
   - 拖拽时每帧都在增长，栈又没有上限。
9. **命中与悬停**
   - `stage/event.ts:110-114`：悬停到根 frame 时直接 return，`hoverId` 还留着上一个子元素。之后在 frame 空白处点击，会选中并拖动这个旧子元素。[已复核]
   - `event.ts:97`：`hitSceneElems` 的顺序是先放子级、再放各顶层元素，不是 z 序。两个 frame 重叠时，点上层 frame 的空白处会命中下层 frame 的子元素。
   - 命中测试不考虑 frame 裁剪、`visible`、`lock`；可视尺寸小于 2px 的元素点不中。
10. **画布渲染**
    - `pipeline.ts:254`：有渲染挂起时直接跳过 `translate`。拖拽中途滚轮平移，画布会停在旧偏移。[已复核]
    - `pipeline.ts:260-292`：平移补画前不清除旧像素。跨视口边缘的半透明元素、阴影会越叠越深，层级也会错乱。
    - `pipeline.ts:237-240`：堆空了也不 break，每次全量渲染都空转满 15ms。[已复核]
    - `viewport.ts:159-165`：resize 不重算 `sceneAABB`，窗口放大后新露出的区域是空白。
    - `pipeline.ts:132`：分片渲染期间丢弃 partial 请求，堆里还留着已销毁的 elem，会出现残影。另外 `event.ts:118` 在分片期间直接丢弃 mousedown。
11. **几何**
    - `transformer.ts:233-256`：起始宽或高为 0 时缩放比是 NaN 或 Infinity，这些值会写进 Yjs 文档。
    - `stage/interact/create.ts:159-166`：在嵌套 frame 里新建的图形只用了父节点的局部矩阵，位置会偏移。
    - `doc/mutator.ts:55`：默认插入位置取的是本地新建对象的 `childIds.length`（恒为 0），`wrapInFrame` 和 `cloneNodes` 后子节点顺序会颠倒。
    - `node.ts:120-124`：跨父多选后包进 frame，节点会同时挂在新旧两个父节点下。
12. **编辑器卸载竞态** [已复核]
    - `toolkit` 的 `Disposer.register` 在 `dispose()` 之后注册的回调永远不会执行。
    - 用户在 `setupFile` 的 IndexedDB 同步完成前离开编辑器，`y-doc.ts:64-66` 之后注册的 `yDoc.destroy` 和 observe/subscribe 清理就都丢了。
    - 建议：`Disposer` 加 `disposed` 标志，已销毁时注册的回调立即执行；`setupFile` 在每个 await 之后检查是否已销毁。

### P2：设计 / 性能 / 体验

- **DI 作用域泄漏**
  - `global/file.ts:19-30` 的全局 `FileAction` 注入了 `YDoc`、`Undo`、`Select`、`LayerNodeTree` 等编辑器级服务，结果在 Global 容器里多出一整套永不释放的编辑器服务。
  - `newFile` 每调用一次就新建一个 Y.Doc 和一个 IDB 连接。
  - 建议：新建文件只写 IndexedDB 或调接口，不要借用编辑器服务。
- **模块级全局状态跨会话残留**
  - `doc/getter.ts` 的 `docGetter` 销毁后不重置。[已复核]
  - `DocHelper.mrectCache` 是静态的，只增不清。
  - 渲染层的 `dpr` 是模块级常量，换显示器后画面变糊。
- **数据层性能**
  - 每次变更都做 `clone`（`y-doc.ts:96`、`render/tree.ts:115`）、`toJSON`、`deepEqual`。
  - `setPlainValue` 每应用一个补丁都浅拷贝 `graphs`，复杂度 O(N)。
  - 只有一个全局 `stateAtom`，任何变更都会让所有 observer 重算。
  - `tree.ts` 每次 clone，导致按引用比较的 memo（矩阵、断行、命中测试）全部失效。
- **渲染性能**
  - 每帧每个元素重建 Path2D。
  - 命中测试全树遍历，没有先做 AABB 预判，也没有空间索引。
  - measureText 的 memoize 没有上限。
  - cursor 生成的 Blob URL 从不 revoke。
- **文本**
  - 字素切分基于 Unicode 10，ZWJ emoji（如 `❤️‍🔥`）会被拆开，属性查找是线性扫描。
  - 断行表基于 tr14-37，泰文等 SA 类文字只能硬断。
  - `text-breaker.ts:57` 会 trim 并合并连续空格，显示与原文不一致。
  - 没有任何测试。建议接入官方的 `LineBreakTest.txt` 和 `GraphemeBreakTest.txt`，字素切分直接改用 `Intl.Segmenter`。
- **阴影**（`drawer.ts:475-482`）：没乘 dpr；按 fill 的下标配对，并且每个 fill 和每个 stroke 各投一次。
- **快捷键**：`command.ts:335` 的 `hotkeys.unbind()` 不带参数，会解绑全部快捷键。
- **协同**：`y-aware.ts:136` 依赖的 `afterSelect` 全仓库没有地方 dispatch。`session.ts` 里 ySync 和 yAware 也被注释掉了，协同目前实际不可用。
- **视图层**
  - `login-dialog/index.tsx:23` 里的 `open` 没有定义，实际读到的是 `window.open`，这个 effect 是死代码。[已复核]
  - 语言检测返回 `zh-CN`，`header.tsx:27` 判断 `=== 'zh'`，第一次点切换没反应。
  - 首页没有错误边界，路由也没有 `errorElement`，`listFiles` 一失败首页整体崩溃。
  - 未登录可以点"新建文件"，抛错后界面没有任何反馈。
  - `uploader.ts:30` 没重置 input 的 value，重选同一文件不触发；`addObject` 之后从不移除。
  - 路由元素没加 `key={fileId}`，从一个文件直接跳到另一个时编辑器不会重建。

---

## 四、安全

- **硬编码凭证** [已复核]
  - `adapters/cloudbase/src/cloudbase.ts:4,8` 直接写了环境 ID 和 accessKey。
  - 这个 key 是 anon 角色的 publishable JWT，公开本身符合设计，但它的 `exp` 约在 2099 年，等于永久有效、轮换不了，也不区分环境。
  - 建议改为通过 `import.meta.env` 注入，并按环境区分。
- **数据隔离完全依赖数据库规则** [已复核]
  - `services/file.ts:26` 的 `listFiles` 是 `select('*').limit(30)`，没按 owner 过滤；`deleteFile` 也只按 id 删。
  - 必须确认 CloudBase 的行级权限已经配好；同时建议在查询里显式加 `.eq('owner', userId)`，作为纵深防御。
- **git 历史里还留着 Pexels API key**：当前代码已经删了，但需要去 Pexels 后台轮换。
- **XSS**：范围内没有 `dangerouslySetInnerHTML` 或 `innerHTML`；ReactSVG 只加载本地资源；y-plain 对 `__proto__` 有防护。风险低。
- **zod 没做运行时校验**：zod schema 只用来推导类型，api 和 cloudbase 都没调用 `parse`，后端返回的数据没有校验。

---

## 五、工程化

- **typecheck 没通过** [已复核：`pnpm -r --no-bail typecheck`]，共 6 个错误：
  - `apps/web/src/view/component/svg-icon.tsx:13,16,19,23`：4 个 TS7006，`useCallback` 的回调参数被推成了隐式 any。
  - `packages/y-plain/playground.ts:137`：1 个 TS2769，Date 不能赋给 undefined。
  - `apps/y-backend`：1 个 TS18003，没有任何源文件。这个包在 main 上是空壳。
- **测试**
  - 只有 `y-plain`（13 个用例）和 `mobx-undo`（2 个用例）有测试。
  - web、api、cloudbase、toolkit、text-break 都是零测试，根目录也没有 `test` 脚本。
- **lint**：没有 eslint。pre-commit 只跑 prettier。上面 `open` 那个 bug 正是 `no-restricted-globals` 能直接拦住的。
- **CI**：只有一个 `publish-nested-assets.yml`，PR 和 push 都不跑 typecheck、test、build；里面用的 `npm@latest` 也不可复现。
- **TypeScript 版本**：根目录用 `7.0.1-rc`，`nested-assets` 单独固定 `5.9.3`，各包用的编译器不一致。
- **auto-import 的代价**
  - `auto-imports.d.ts` 被 gitignore，新 clone 下来必须先跑一次 vite，typecheck 才能通过，CI 很难直接接上。
  - `css`、`t`、`G`、`observer`、`reflection` 都是隐式全局，depcheck 和 grep 都查不到依赖关系。
- **零引用的依赖**（已 grep 确认）：
  - axios、cos-js-sdk-v5、pexels、react-tiny-popover、file-type、react-intersection-observer
  - svg-arc-to-cubic-bezier、svg-parser、svg-path-bounding-box、svg-path-parser，以及对应的 `@types`
  - nano-string-utils、@multiavatar/multiavatar、@radix-ui/react-slot、vite-plugin-react-click-to-component
- **幽灵依赖**：web 和 cloudbase 都用了 `es-toolkit` 却没声明；cloudbase 的生成脚本用了 `prettier` 也没声明。
- **包边界**
  - `vite.config.ts:1` 绕过包名，直接 import `../../packages/nested-assets/src`。
  - `types/design.d.ts` 反向引用了 apps/web 的 `src/editor/geometry`。
  - `packages/backend` 下只剩一个残留的 `node_modules`。
- **`agents.md` 与实际不符**
  - 提到的 `ai/instructions` 目录不存在。
  - 规定"使用相对路径导入"，实际约 500 处用 `src/` 别名，`.vscode/settings.json` 配的也是 `non-relative`。
  - 规定"样式参考 linaria"，实际用的是 `@emotion/css`，项目里没有 linaria。
  - `text-break` 目录下有 PascalCase 文件名（如 `LineBreaker.ts`），违反 kebab-case 规定。
  - 文件名是小写 `agents.md`，在大小写敏感的系统上，读 `AGENTS.md` 的工具会找不到。

---

## 六、建议路线（按投入产出比）

1. **先止血（约 1 天）**
   - 修 P0 的 1–5。
   - 修 `svg-icon.tsx` 的类型错误，让 typecheck 变绿。
   - 删掉或补全 `apps/y-backend` 的占位。
2. **加护栏（约 1 天）**
   - 接入 eslint（至少开 `no-restricted-globals`、`react-hooks/exhaustive-deps`、`no-floating-promises`）。
   - 加一个 GitHub Actions 工作流跑 typecheck 和 test：先生成 `auto-imports.d.ts`，或者把它提交进仓库。
3. **重做撤销（2–3 天）**
   - 以 `Y.UndoManager` 为唯一的栈，客户端状态放进 `stackItem.meta`。
   - 去掉 `statePatches` 和自定义栈。
   - 为常见操作补端到端测试。
4. **把文档存储接通**
   - 明确文档内容放云端还是只放本地。
   - 打通 `loadFile`，启用 ySync，修 `afterSelect`，否则"换设备打开"和协同都做不到。
5. **数据层性能**
   - 去掉 `distribute` 和 `tree.ts` 里的整份 `clone`，按 patch 粒度更新。
   - 把单个 `stateAtom` 拆成按 node 粒度。
   - 命中测试先做 AABB 预判；缓存 Path2D。
6. **清理**
   - 删掉零引用的依赖，补上幽灵依赖。
   - 更新 `agents.md`，让它和实际约定一致（emotion、`src/` 别名）。
   - text-break 接入官方 Unicode 测试集，或者换用 `Intl.Segmenter`。
