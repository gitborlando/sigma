# editor 顶层模块评价

评分：**6.0 / 10** —— 作为编排层「能跑」，但 command/setting/undo/img-manager 四个服务风格各异、生命周期模型不一致，是 editor 里「什么都往这塞」的杂物间。

涉及文件：`editor.ts`(99) / `command.ts`(205) / `undo-service.ts`(115) / `client-undo.ts`(240) / `setting.ts`(49) / `img-manager.ts`(55) / `mock/*` / `client-undo.test.ts`(96)

> undo 相关架构见 `ai/reviews/.../undo-redo-architecture.md`，本评价聚焦 editor 顶层的编排角色，不重复 undo 细节。

---

## 1. 意图

`editor/` 这一层是 **整个编辑器的编排入口**。它要回答四个问题：

1. **生命周期**：编辑器怎么启动、怎么销毁、各子模块按什么顺序 subscribe（`editor.ts`）；
2. **命令**：快捷键和右键菜单的命令怎么注册和分发（`command.ts`）；
3. **撤销**：client state 的 patch 历史（`client-undo.ts`）+ 状态/客户端混合 undo 栈（`undo-service.ts`）；
4. **杂项**：编辑器设置（`setting.ts`）、图片资源（`img-manager.ts`）、测试 schema（`mock/`）。

它本身不实现业务，只把各层 service 接到一起。

---

## 2. 架构画像

- **`EditorService`**（`editor.ts`）：`initSchema(fileId)`（加载/migration schema → YState.initSchema → YClients.init → StageViewport.init）+ `initEditor()`（subscribe 各 service + initHooks）+ `dispose()`。用 `Disposer.combine` 收集所有 service 的 subscribe 返回值。
- **`EditorCommand`**（`command.ts`）：把命令分成 copyPaste/undoRedo/page/node/nodeReHierarchy/createShape/file 七组（getter 返回 `Command[]`），`bindHotkeys` 用 hotkeys-js 绑快捷键。
- **`Undo`**（`undo-service.ts`）：混合 undo 栈（`UndoInfo[]`，type ∈ state/client/all），`track/untrack/undo/redo/replayInfo`。`initStateUndo` 时建 `Y.UndoManager`。
- **`ClientUndo`**（`client-undo.ts`）：基于 `travels` 库的 client state patch 历史。`register(target, fields)` 注册一个 slice，把 target 的指定字段镜像到 travels state。
- **`EditorSetting`**：localStorage 持久化的编辑器设置（autosave/devMode/needSliceRender 等）。
- **`ImgManager`**：图片加载缓存（objectUrl → IImage）。
- **`mock/`**：测试用 schema 工厂（transfrom/collide/polyline/transfrom_v）。

---

## 3. 成立的部分

### 3.1 `EditorService` 的 `Disposer.combine(subscribe...)` 模型是清晰的生命周期管理

```ts
private subscribe() {
  return Disposer.combine(
    HandleNode.subscribe(), HandlePage.subscribe(),
    StageSurface.subscribe(), StageScene.subscribe(), ...
  )
}
dispose() {
  Editor.inited.value = false
  YState.dispose()
  this.disposer.dispose()
}
```

每个 service 的 `subscribe()` 返回一个 disposer，`Editor` 用 `Disposer.combine` 统一回收。`initEditor` 时 add，`dispose` 时统一释放。这是长生命周期编辑器该有的样子（`editor-lifecycle-effects.md` 也认可这个方向）。

`inited` Signal 用来标记初始化完成，`initSchema` 和 `initEditor` 分两步（先 schema 后 editor），允许「schema 加载完再启动渲染订阅」。

### 3.2 `EditorCommand` 的「命令分组 + getter」让快捷键和菜单共享定义

```ts
get nodeGroup(): Command[] { return [{name: t('delete'), shortcut: 'del', callback: ...}, ...] }
```

每个 group 是一个 getter 返回 `Command[]`，既被 `bindHotkeys` 遍历绑快捷键，也被 `StageSelect.onContextMenu` 拿去组装右键菜单。一份定义两处用，避免「快捷键和菜单不同步」。

`when` 谓词控制命令可用性（如 copy 要求有选中），是命令系统的标准设计。

### 3.3 `ClientUndo.register` 的「target 字段镜像」思路聪明

```ts
register<TTarget, TField>(key, target, fields) {
  // 把 target 的 fields 镜像到 travels state[key]
  // 并 subscribe slice，slice 变化时写回 target
}
```

`HandleSelect` 调 `ClientUndo.register('select', this, ['selectIdMap', 'selectPageId'])`，于是 HandleSelect 的这两个字段自动参与 client undo，而 HandleSelect 自己不用关心 travels。这是「让现有 observable 对象自动获得 patch 历史」的解法，方向有创意。

### 3.4 `client-undo.test.ts` 是 editor 里罕见的测试

虽然只是个跑在文件末尾、用 setTimeout 演示 undo/redo 的「脚本式测试」（不是真正的单元测试，没有断言），但它至少**演示了 ClientUndoService 的预期用法**（register → set → archive → undo → redo）。在几乎没有测试的 editor 里，这是唯一一处「使用文档」。

---

## 4. 问题与风险

### 4.1 四个服务的「初始化风格」完全不一致，没有统一协议 ⚠️

并排看：

| 服务            | 初始化方式                               | 副作用挂载点                                  |
| --------------- | ---------------------------------------- | --------------------------------------------- |
| `EditorService` | `initSchema()` + `initEditor()` 两个方法 | `disposer.add(subscribe())`                   |
| `EditorCommand` | `init()`                                 | 内部 `bindHotkeys`，无 disposer 返回          |
| `EditorSetting` | `init()`                                 | 内部 `reaction`，无 disposer 返回             |
| `Undo`          | `initStateUndo(config)`                  | 无显式 disposer（靠 YState dispose 间接清理） |
| `ClientUndo`    | 构造函数内 subscribe                     | 无 disposer 接口                              |
| `ImgManager`    | 无 init                                  | 无副作用                                      |

有的返回 disposer、有的不返回、有的在构造函数里就 subscribe、有的要手动 init。`Editor.initHooks` 里手动调 `EditorSetting.init() / EditorCommand.init() / OperateAlign.initHook() / ...`，但 `EditorCommand.init` 和 `OperateAlign.initHook` 命名都不统一（init vs initHook）。

这是 `editor-lifecycle-effects.md` 直接批评的点：**service 既承担业务能力又管理副作用**。当前没有任何结构强制「副作用必须返回 disposer」，全靠每个服务自觉。

> 方向（与笔记一致）：统一成 `service`（状态能力，无副作用）+ `effect`（接线，返回 disposer）+ `session`（持有 disposer）。所有 init 改成 effect，命名统一。

### 4.2 `EditorCommand.bindHotkeys` 用 hotkeys-js 全局绑定，无 disposer，无法卸载 ⚠️

```ts
private bindHotkeys = () => {
  commandList.forEach(({ shortcut, callback }) => {
    if (!shortcut) return
    hotkeys(shortcut!, (e) => { e.preventDefault(); callback({}) })
  })
  listen('keyup', () => (isKeyDown = false))
  listen('keydown', (e) => { if (e.altKey) e.preventDefault() })
}
```

`hotkeys(shortcut, handler)` 是全局绑定，`Editor.dispose()` 时**没有 unbind**。如果编辑器被销毁重建（多文件切换、SPA 路由），快捷键会重复绑定，每次按 ctrl+z 触发 N 次。`listen('keyup'/'keydown')` 同理（虽然 listen 返回 disposer 但这里没接收）。

而且 `isKeyDown` 这个「防止 ctrl+c 长按重复触发」的 flag 是模块级闭包，多实例下会串。

### 4.3 `command.ts` 的回调签名混乱：有的接 `{id}` 有的接 `{}`

```ts
{ name: t('delete page'), callback: ({ id }: { id: ID }) => HandlePage.removePage(...) }
{ name: t('copy'), callback: () => HandleNode.copySelectedNodes() }
```

`callback` 的参数类型不统一：page/node 组的命令期望从 context menu 拿 `{id}`，但 hotkeys 触发时传的是 `{}`。类型上 `callback: (arg: any) => void` 兜过去，但「右键菜单触发」和「快捷键触发」的 callback 上下文不同，没有类型区分。如果快捷键触发了 `delete page` 但没有 id，会 NPE。

### 4.4 `Editor` 是全局单例 `export const Editor = autoBind(new EditorService())`，但 `dispose` 后状态没彻底重置

```ts
dispose() {
  Editor.inited.value = false
  YState.dispose()
  this.disposer.dispose()
}
```

`dispose` 后 `inited=false`、disposer 释放，但 `EditorService` 实例本身的 `disposer = new Disposer()` 字段没重建——如果 `dispose` 后再调 `initEditor`，`this.disposer.add(...)` 会往一个已 dispose 的 Disposer 里 add（取决于 Disposer 实现，可能静默丢弃或抛错）。

这和 `YState` 单例问题（见 y-state 评价 4.4）是同源：**单例 + 可 dispose = 状态机陷阱**。

### 4.5 `editor.ts` 的 `initSchema` 里 mock 分支和正常分支耦合

```ts
if (fileId === 'mock') {
  let mockSchema = mock_transform_v()
  if (mockSchema) schema = mockSchema
} else {
  const fileMeta = await FileService.getFileMeta(fileId)
  // ... jszip 解压 + migration
}
if (schema) {
  YState.initSchema(fileId, schema)
  this.disposer.add(YClients.init())
  StageViewport.init()
}
```

`fileId === 'mock'` 是个魔法字符串分支，混在文件加载逻辑里。mock 路径不走 migration（mock_transform_v 直接造的就是最新版），但正常路径走。这种「特殊 fileId」应该抽成一个明确的 `loadMockSchema()` / `loadFileSchema(fileId)` 两个函数，而不是 if/else 分支耦合。

而且 `mock_transform_v` 这个命名（`_v` 后缀）暗示有版本演进，但只有一个文件。

### 4.6 `setting.ts` 的 `dev.fixedSceneMatrix` + `DEV_loadSceneMatrix` 让 dev 设置影响运行时行为

```ts
// setting.ts
dev: { fixedSceneMatrix: true, sceneMatrix: Matrix.identity(), ... }

// viewport.ts
@action private DEV_loadSceneMatrix() {
  const { fixedSceneMatrix, sceneMatrix } = getEditorSetting().dev
  if (fixedSceneMatrix) this.sceneMatrix = Matrix.of(sceneMatrix)
}
```

`fixedSceneMatrix: true` 默认开，意味着 **默认构建下视口矩阵会被 dev 设置强制覆盖成 identity**，每页切换都重置。这对开发调试有用，但对「真实使用」是危险的——一个 dev 开关默认开，会让真实用户的视口记忆失效。

`devMode: isDEV` 也是默认在 dev 下开，但 `fixedSceneMatrix` 不在 devMode 守卫内，生产构建也会生效。应该要么默认 `false`，要么用 `isDEV` 守卫。

### 4.7 `img-manager.ts` 的 `uploadLocal` 返回 base64 但命名说 upload

```ts
async uploadLocal(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)   // base64
    reader.onload = (e) => resolve(e.target?.result as string)
  })
}
```

这个方法把文件读成 base64 dataURL 返回，但叫 `uploadLocal`（上传到本地？）。而且 `reader.onerror` 没处理，文件读取失败会 promise 永远 pending。`getImageAsync` 的 `await image` 也有问题——`getImage` 返回 `IImage | undefined`，`await undefined` 是 undefined，逻辑上 `if (image) return await image` 永远返回 undefined 而不是去 load。

### 4.8 `undo-service.ts` 的 `restoreHistory` 暴露但无人调用

```ts
restoreHistory(stack: UndoInfo[], next: number) {
  runInAction(() => { this.stack = stack; this.next = Math.min(next, stack.length) })
}
```

全文搜索没有调用方。可能是预留给「协作时同步 undo 栈」或「快照恢复」，但当前是死代码。`undo-redo-architecture.md` 也提到 `info.localHistory` 是「纯负担」（虽然当前 undo-service.ts 里已经没有 localHistory 字段了，看来已清理，这点是好的）。

### 4.9 `mock/` 里有 `collide.ts`/`polyline.ts`/`transfrom.ts`/`transfrom_v.ts`，命名拼写错误且职责不清

`transfrom` 是 `transform` 的拼写错误（r 和 o 顺序反了），文件名和导出函数都是。`transfrom_v` 的 `_v` 含义不明。`collide`/`polyline` 看名字像命中测试数据，但放在 `editor/mock` 下而不是 test 目录。

这些 mock 文件本质是「手写测试 schema」，应该有个更明确的目录（如 `__fixtures__/`）和正确拼写。

---

## 5. 方向建议

1. **统一服务初始化协议**（最高优先级）：所有副作用挂载统一成 `subscribe(): Disposer`，去掉 init/initHook/initHook 三种命名。Editor 只调 subscribe。这是 `editor-lifecycle-effects.md` 的核心建议。
2. **`EditorCommand.bindHotkeys` 返回 disposer**，dispose 时 unbind。修 `isKeyDown` 多实例问题。
3. **命令 callback 类型化**：区分 `Command<{id?}>`（菜单）和 `HotkeyCommand`（无 context），类型层杜绝「快捷键触发需要 id 的命令」。
4. **`Editor` 单例改 per-session**，或 dispose 时彻底重置内部 disposer。
5. **`initSchema` 拆 `loadMock` / `loadFile`**，去掉魔法字符串。
6. **`setting.dev.fixedSceneMatrix` 默认 false 或 isDEV 守卫**，避免污染生产。
7. **`img-manager` 修 `getImageAsync` 的 await 逻辑**，`uploadLocal` 加 onerror 并改名 `readAsDataURL`。
8. **删 `restoreHistory` 死代码**（或登记用途）。
9. **mock 目录改名 + 修拼写**（`transform`），或移到 `__fixtures__`。

---

## 小结

这一层是 editor 的「门面」，它的存在是必要的，但它把「生命周期编排 + 命令 + undo + 设置 + 图片 + mock」六件事塞一起，且每件事的初始化风格都不同。最大的结构性问题是 **没有统一的「服务副作用挂载协议」**——有的返回 disposer、有的不返回、有的在构造函数里就做事。这直接导致 dispose 不彻底（command 的 hotkeys 泄漏）、多实例不安全。把初始化协议统一成 `subscribe(): Disposer`，这一层会从「能跑的杂物间」变成「清晰的编排层」。
