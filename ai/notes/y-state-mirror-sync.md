# YState Mirror Sync Note

## 背景

当前 `YState` 同时维护两层状态：

- `Y.Doc` / `schema`：运行时权威源。
- `Immut`：本地渲染和订阅使用的镜像。

因此 `set` / `insert` / `delete` 时，会出现一个问题：本地写入后，到底是立刻同步 `Immut`，还是只写 `Yjs`，等 observer 再投影回来。

## 当前语义

现在的规则是：

- `没有 doc`：直接写 `Immut`。
- `有 doc 且不在 transact`：只写 `Yjs`，由 `observeDeep -> Immut` 投影回来。
- `有 doc 且在 transact`：先写 `Yjs`，同时立刻同步 `Immut`。

简化成一句话就是：

```txt
平时让 observer 同步；
事务内为了保证同一事务里的后续读取一致，允许提前同步本地镜像。
```

## 为什么 transact 里要立刻同步

原因不是“想双写”，而是“同一个 transaction 里后续代码还会继续读 `YState.state`”。

如果 transact 内只写 `Yjs`，不立刻改本地 `Immut`，那么同一事务后面的逻辑读到的还是旧值，容易出现：

- 父子关系刚写入，但后续读取还是旧 `childIds`
- `parentId` 已写，但后续逻辑还按旧父级继续算
- 一组关联写入里，前一步已经生效，后一步却还是按旧镜像运行

所以 transact 内的“立刻同步”本质上是为了维持单次事务内部的读写一致性。

## 为什么立刻同步后 observer 还保留

这里要区分两件事：

- `不让 observer 存在`
- `让 observer 存在，但不要产生第二次有效写入`

当前做的是后者。

observer 还必须保留，因为它不只是服务本地这一次写入，它还承担：

- 远端协同变更进入本地镜像
- 非 transaction 本地写入后的统一投影
- 整体 `Yjs -> Immut` 单向投影入口

所以不能因为 transact 内提前同步了本地镜像，就把 observer 整体关掉。

## 当前依赖的前提

既然 transact 内会“提前同步本地”，那 observer 回来时就不能再产生第二次有效变更。

当前依赖的就是 observer 侧的幂等判断：

- map set 前先比较新旧值，相同就不再 `i.set()`
- array 事件前先比较整个数组，相同就直接跳过
- delete 前先看本地值是否仍存在，不存在就不再删

也就是说：

```txt
事务内：先本地同步，保证后续读取一致
observer：继续运行，但应尽量退化成幂等兜底
```

## 风险点

如果某一类结构在 observer 侧没有做好幂等判断，就会重新出现“双写”问题。

之前数组 `insert` 导致重复 `childIds`，本质就是：

- 本地先写了一次
- observer 又按数组事件投影了一次

所以这套语义成立的前提，不是“提前同步了就完全不走 observer”，而是“observer 在这种情况下不会再次产生实际变更”。

## 后续可优化方向

如果后面要继续收敛，可以考虑更强的方案，例如：

- 基于 transaction origin 区分“本地事务回放”和“远端协同变更”
- 让 observer 对本地 origin 做更明确的忽略或降级

但这会扩大改动面，当前阶段先不做。

## 一句话结论

`YState` 现在的策略不是简单双写，而是：

平时由 `Yjs -> observer -> Immut` 维护镜像；只有在 transaction 内，为了保证同一事务里的后续读取一致，才提前同步本地 `Immut`，而 observer 继续保留为幂等兜底和远端投影入口。
