# Suspense Render-Time Instance Mismatch Note

## 要点

如果一个对象实例是在组件渲染期间创建的，而同一次渲染又会因为 `Suspense` 中断，那么首次渲染里创建出来的实例可能会被丢弃。React 重试挂载时，会再创建一个新实例。

这时就可能出现：

```txt
副作用跑在实例 A 上
界面最终拿到实例 B
```

`useMemo([])` 不能避免这个问题，因为它只对“已经成功挂载的组件实例”生效，不能跨越“首次挂载失败后重新挂载”。

## 最小复现

下面这个例子已经足够说明问题：

```tsx
let cached: any

class Store {
  ready?: boolean

  async init() {
    this.ready = true
    cached = this
  }
}

function Demo() {
  const store = useMemo(() => new Store(), [])

  suspend(() => store.init(), ['demo'])

  console.log(store === cached, store.ready, cached?.ready)

  return null
}
```

如果 `suspend()` 在第一次渲染时触发挂起，就可能看到类似结果：

```txt
false undefined true
```

含义是：

- `cached` 指向的是第一次渲染时初始化过的 `store A`
- 当前组件恢复后拿到的是第二次挂载创建的 `store B`
- `store B` 没跑过 `init()`，所以它的 `ready` 还是 `undefined`

## 为什么会这样

关键不在 `Store`，而在 React 对首次挂载 + `Suspense` 的处理方式。

可以把流程理解成：

1. React 开始首次挂载组件
2. 执行 `useMemo(() => new Store(), [])`，得到 `store A`
3. 渲染继续，执行 `suspend(() => storeA.init(), ['demo'])`
4. 这次首次挂载没有完成 commit
5. React 丢弃这次未完成挂载
6. React 重新执行一次首次挂载
7. 再次执行 `useMemo(() => new Store(), [])`，得到 `store B`
8. 如果 `suspend` 对同一个 key 直接复用前一次结果，就不会再为 `store B` 执行 `init()`
9. 最终组件里可见的是 `store B`，但初始化发生在 `store A`

所以问题本质是：

```txt
首次挂载未提交
导致 render 期创建的实例不稳定
```

## 为什么 `useMemo([])` 没兜住

`useMemo([])` 的保证范围是：

- 同一个已提交组件实例的后续 render，会复用 memo 结果

它不保证：

- 首次挂载还没提交，就被 suspend 中断并整体丢弃时，之前那次 memo 结果还能保留

换句话说：

```txt
已 commit 后的 rerender：useMemo 会复用
未 commit 就被丢弃的首次挂载：useMemo 会重跑
```

所以“出现两个实例”并不代表 `useMemo` 失效，而是第一次挂载根本没有成功建立可复用的组件实例。

## 什么时候容易踩坑

下面这种组合最容易出现这个问题：

- 在 render 期间创建会话级对象、service、store、container
- 同一次 render 里立刻触发 `Suspense`
- 初始化逻辑又和第一次创建出来的实例绑定
- `Suspense` 缓存按 key 命中，恢复时不再重新初始化新实例

## 应对原则

重点不是给消费处补空判断，而是避免把“必须和当前挂载实例一致”的对象创建放在一个可能被 `Suspense` 丢弃的 render 过程中。

要修的通常是：

- 实例创建时机
- 实例生命周期归属
- `Suspense` 初始化和实例之间的绑定关系

而不是：

- 只在读取处判空
- 只修日志现象

## 一句话结论

只要实例是在 render 里创建的，而 render 又可能在首次 commit 前被 `Suspense` 丢弃，那么 `useMemo([])` 也不能保证这个实例只有一个；副作用可能落在旧实例上，界面却消费新实例。
