# y-state 模块评价

评分：**6.5 / 10** —— Immut + Yjs 镜像是真正有价值的探索，方向对；但「双写时机」「协作默认关」「路径式 API 兼具 set/insert/delete 三套归一化」让它脆弱。

涉及文件：`y-state.ts`(300) / `y-clients.ts`(116) / `y-sync.ts`(100)

> 相关笔记：`ai/notes/y-state-mirror-sync.md`、`ai/reviews/.../undo-redo-architecture.md`。本评价与之一致，并补充从代码看到的新问题。

---

## 1. 意图

这一层是**整个编辑器的唯一事实源（Source of Truth）**。它要同时满足三个互相拉扯的目标：

1. **业务代码主要操作普通 JS 对象**（`S.Schema`），而不是直接摸 Yjs 的 Map/Array；
2. **保留 CRDT 同步能力**（多人协作、离线合并）；
3. **能产出可撤销的 patch**（给 Undo 用）。

作者的解法是 **「Immut(自研不可变状态 + patch) ↔ Y.Doc 双向镜像」**：业务写 Immut，Immut 把变更投影到 Yjs；或业务写 Yjs，Yjs observer 把变更投影回 Immut。这是 Sigma 最有技术含量、也最需要被理解的一层。

---

## 2. 架构画像

- **`YStateService`**（`y-state.ts`）：核心容器。持有 `doc: Y.Doc` + `immut: Immut<S.Schema>`。对外暴露路径式 API：`set/insert/delete(keyPath, value)`、`transact(cb)`、`find(id)`、`applyImmerPatches`、`subscribe`、`getPatches`。
- **`y-sync.ts`**：`YSyncService`，封装 `HocuspocusProvider` + `Awareness`，是协作链路的传输层。
- **`y-clients.ts`**：`YClientsService`，管理「自己 + 他人」的 awareness 状态（光标、选区、视口矩阵、用户信息），并把本地 `HandleSelect` 状态同步到 awareness。

`YState` 内部维护两层：

- `doc.getMap('schema')`：Yjs 权威源；
- `immut.state`：本地镜像，渲染层（scene/elem）和业务层都读它。

`bind(immut, yMap)`（来自 `utils/immut/immut-y`）负责把两者绑在一起。

---

## 3. 成立的部分

### 3.1 「业务写普通对象，CRDT 在底层」这个分层方向是对的

绝大多数协作编辑器要么「业务直接操作 Yjs」（痛苦，Yjs API 命令式、类型差），要么「业务操作普通对象，CRDT 是另一套」（同步逻辑分散）。Sigma 选择「Immut 作为业务的统一对象门面，Yjs 作为底层权威源，两者镜像」，是一个**让业务代码读起来像普通 immutable state、又保留 CRDT 能力**的中间路线。

如果这套稳定，它是项目区别于普通前端编辑器 demo 的核心资产（`gpt5.5-comment.md` 也这么判断）。

### 3.2 `transact` 内立刻同步 Immut 的语义，有合理的工程理由

`y-state-mirror-sync.md` 解释了为什么 transact 内要双写：

> 同一个 transaction 里后续代码还会继续读 `YState.state`。如果只写 Yjs，不立刻同步本地镜像，那事务后面的逻辑读到的是旧值（父子关系刚写但读到旧 childIds 等）。

代码里 `transactionDepth` 计数 + `if (!this.doc || this.transactionDepth > 0) this.immut.xxx()` 实现了这套语义。这个判断是**对的**——它不是为了双写而双写，是为了维持单次事务内部的读写一致性。笔记里也说了这不是最终形态，是一个合理的过渡。

### 3.3 路径式 API + `normalizeXxxPath` 防御性归一，方向稳健

`set/insert/delete` 都先过 `normalizeSetPath/normalizeInsertPath/normalizeDeletePath`：

- 对数组路径，校验 index 合法并 clamp；
- 对对象路径，校验父级存在且是对象。

这能在「业务传了越界 index / 不存在的 key」时静默 no-op，而不是让 Yjs 抛错或留脏数据。对一个会被几十处调用、路径由字符串拼接的 API，这层防御是必要的。

### 3.4 `applyImmerPatches` 让 operate 层能用 immer 草稿

```ts
applyImmerPatches(patches, prefix) {
  patches.forEach((patch) => {
    const keys = prefixes.concat(patch.path)
    switch (patch.op) {
      case 'add': Number.isNaN(lastKey) ? insert : set
      case 'replace': set
      case 'remove': delete
    }
  })
}
```

这让 `operate/fill.ts` 能用 `produceWithPatches` 写 immer 草稿，再把 patch 喂回 YState。是把「immer 生态」和「自研路径式 API」桥起来的聪明做法。

### 3.5 `YClients` 的 awareness 同步拆成 `syncSelf/syncOthers` 思路清晰

`syncSelf`：每个 client field 一个 reaction → `awareness.setLocalStateField`；选区单独走 `afterSelect.hook`。
`syncOthers`：监听 awareness update，diff 后赋值 `this.others`。

把「上报自己」和「接收他人」分成两个对称的方法，比混在一个 update 回调里清晰。

---

## 4. 问题与风险

### 4.1 协作链路默认是关的，但代码到处假设它是开的 ⚠️（最该解决的问题）

`editor.ts` 的 `initSchema`：

```ts
this.disposer.add(YClients.init())
// this.disposer.add(YSync.init(fileId, YState.doc))   // 注释掉了
```

`y-state.ts` 的 `initSchema`：

```ts
this.doc = new Y.Doc()
// YSync.init(fileId, this.doc)   // 注释掉了
```

但 `YClients.syncSelf/syncOthers` 内部直接调 `YSync.awareness.setLocalState(...)`——**如果 YSync 没初始化，这里会 NPE**。当前能跑只是因为 `YClients.init()` 里没调 `syncSelf/syncOthers`（那俩是 `YSync.init` 内部调的，而 YSync.init 被注释了）。

也就是说：**当前默认构建下，多人协作、他人光标、他人选区全部不工作**，但代码结构假设它们工作。这让「Sigma 支持协作」更像一个历史能力/目标，而不是当前事实（`gpt5.5-comment.md` 已指出）。

> 这不是「代码写得不对」，是「链路被注释但相关代码没下线」。要么恢复并验证协作，要么把 YClients 里依赖 YSync 的部分显式标 `if (YSync.inited$.value)` 守卫，并在 README 标注「协作暂未启用」。

### 4.2 「双写时机」靠 `transactionDepth` 隐式判断，是脆弱的契约 ⚠️

```ts
set(keyPath, value) {
  if (this.doc) this.setYValue(nextKeyPath, value)        // 总是写 Yjs
  if (!this.doc || this.transactionDepth > 0) {
    this.immut.set(nextKeyPath, value)                    // doc 不存在 或 在事务内 才写 immut
  }
}
```

这里有三条路径，语义全靠 `transactionDepth` 这一个数字撑着：

| 场景                   | 写 Yjs? | 写 Immut? | 谁让 Immut 最终一致?   |
| ---------------------- | ------- | --------- | ---------------------- |
| 无 doc（mock/单机）    | 否      | 是        | 直接写                 |
| 有 doc + 不在 transact | 是      | **否**    | Yjs observer → Immut   |
| 有 doc + 在 transact   | 是      | 是        | 双写（事务内立即一致） |

风险在于：

1. **「不在 transact 时只写 Yjs」依赖 observer 一定回投**。如果 `bind` 的 observer 因为某种原因没触发（比如 Yjs 对该路径不敏感、或被 origin 过滤），Immut 就和 Yjs 静默不一致，渲染层读 Immut 就读到旧值。
2. **「在 transact 时双写」依赖 observer 不会重复投**。如果双写后 observer 又投一次，Immut 会被 apply 两次（一般幂等没事，但 patch 历史会多一条）。
3. **transactionDepth 是裸计数器，没有 try/finally 之外的护栏**。虽然 `transact` 用了 try/finally 保证 depth 归零，但 `immut.next()` 在 finally 之后调用——如果在事务内 throw，depth 归零了但 `next()` 没执行，Immut 状态可能停在中间态。

这是 `y-state-mirror-sync.md` 自己也承认「不是最终形态」的地方。当前能 work，是因为业务代码几乎都在 `transact` 内操作（handle/operate 层都是），observer 回投路径用得少。但这意味着 **「无 doc 单机模式」和「有 doc 协作模式」走的是不同的代码路径**，前者直接写 Immut，后者靠 observer——两者行为差异没人保证一致。

> 方向（与笔记一致）：把「事务内立即同步」变成**唯一**路径，即「写永远先到 Immut，Immut 的变更通过 bind 单向投影到 Yjs」，去掉「写 Yjs 等 observer 回投」这条反向路径。这样 Immut 永远是业务的直接读写对象，Yjs 只是它的 CRDT 投影。代价是要重写 bind 让它支持 Immut→Yjs 单向。

### 4.3 路径式 API 的 `parseKeyPath` 同时支持 `.` 和 `/` 分隔，是隐患

```ts
private parseKeyPath(keyPath: string) {
  return keyPath.split(/\.|\//) as (string | number)[]
}
```

业务代码里 keyPath 几乎全是 `.` 分隔（`${node.id}.fills.0.color`），但这里同时接受 `/`。问题在于：**如果某个 id 或字段名里恰好含 `.` 或 `/`**（比如未来的复合 id），会被错误切分。而且 `insert` 对数组路径用 `Number(lastKey)` 判断是否 index，但 id 也可能是纯数字字符串（`miniId()` 产生的就是）。

更稳的做法是让 keyPath 是 `(string|number)[]` 而不是字符串，类型层就杜绝歧义。当前字符串拼接的写法（`${node.id}.style.${key}`）虽然好用，但牺牲了类型安全。

### 4.4 `YState` 是单例，与「编辑器会话可多次创建/销毁」冲突

`export const YState = new YStateService()` 是全局单例。`editor.ts` 的 `dispose()` 调 `YState.dispose()`，`initSchema` 调 `YState.initSchema`。但单例意味着：

- 不能同时开两个编辑器实例（多 tab 编辑不同文件）；
- `dispose` 后如果有人还持有旧引用并调用，会 NPE（doc 是 undefined）。

这跟 `editor-lifecycle-effects.md` 推的「session 模型」直接冲突。YState 作为「一次编辑会话的状态容器」，应该是 per-session 的，而不是全局单例。

### 4.5 `applyImmerPatches` 的 add 判断 `Number.isNaN(Number(lastKey))` 与 `normalizeInsertPath` 重复且语义重叠

```ts
case 'add':
  if (!Number.isNaN(Number(keys[last]))) this.insert(keyPath, value)
  else this.set(keyPath, value)
```

而 `insert` 内部又有 `normalizeInsertPath` 判断「最后一段是不是数字 index」。两层判断逻辑分散在两处，且 `immer` 的 `add` op 对数组是 push（index = length）、对对象是 set key，语义其实和 `insert/set` 的拆分不完全对应（immer add 到对象 key 走 set 没问题，但 add 到数组越界 index 走 insert 会被 normalize clamp，可能不是 caller 预期）。

### 4.6 `YClients` 把「自己 client 状态」和「others」混在一个服务里，且强依赖 HandleSelect/StageViewport

`YClients` 既是「我的 awareness 状态容器」（`client: S.Client`），又是「他人 awareness 容器」（`others: S.Clients`），还主动 `reaction` 监听 `HandleSelect` 和 `StageViewport.sceneMatrix` 上报。

这违反了「数据层不该反向依赖交互层」。`YState` 是纯数据，`YClients` 却 import 了 `HandleSelect`/`StageViewport`/`UserService`。更干净的是：`YClients` 只提供 `setLocalClient(patch)` 和 `others`，由一个 effect 把 `HandleSelect/StageViewport → YClients.setLocalClient` 接起来。

### 4.7 `y-sync.ts` 硬编码 `wss://api.gitborlando.com`

```ts
this.provider = new HocuspocusProvider({
  url: 'wss://api.gitborlando.com',
  name: fileId,
  document,
})
```

URL 硬编码在代码里，没有走环境变量/配置。dev 注释里写了 `//'ws://localhost:1234'`，说明作者知道要切换，但没做成配置项。

---

## 5. 方向建议

1. **决定协作是否启用**：要么恢复 `YSync.init` 并端到端验证（他人光标/选区/编辑合并），要么给 YClients 加 `if (YSync.inited$.value)` 守卫并下线相关 reaction，README 标注。这是 4.1，优先级最高。
2. **统一双写为「Immut 单一读写对象 + 单向投影到 Yjs」**：去掉「写 Yjs 等 observer 回投」反向路径，让 Immut 永远是业务的直接对象。这是 4.2，是这一层最大的架构债。
3. **keyPath 改成 `(string|number)[]`**：类型层杜绝分隔符歧义。配合一个小的 path builder helper 让调用方不至于写太难看。
4. **`YState` 从单例改成 per-session**：配合 editor lifecycle 的 session 模型。
5. **`YClients` 拆成「local client state」+「others」**，并去掉对 HandleSelect/StageViewport 的直接 import，改由 effect 接线。
6. **`y-sync.ts` 的 URL 走配置**。
7. **补 Immut/immut-y 的单测**：这是「错一点全局异常」的基础设施，必须有「写 Immut → Yjs 一致」「写 Yjs → Immut 一致」「事务原子性」三类测试。

---

## 小结

这一层是 Sigma 技术含量最高的地方，也是当前最需要被「钉死」的地方。Immut+Yjs 镜像的方向是对的，`transact` 内双写的理由也站得住，但 **「双写时机靠 transactionDepth 隐式判断」+「协作默认关但代码假设开」** 两个问题让它在「能跑」和「可靠」之间有明显的缝。把双写收敛成单向投影、把协作链路要么开要么显式关，这一层就能从「有探索价值」变成「可投产」。
