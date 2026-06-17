# math 模块评价

评分：**8.5 / 10** —— 项目里最干净、抽象选型最正确的一层。

涉及文件：`base.ts`、`matrix.ts`、`mrect.ts`、`point.ts`、`index.ts`、`bezier/bezier.ts`、`bezier/points-of-bezier.ts`

---

## 1. 意图

这一层想做的是：**为整个编辑器提供一套统一的、矩阵化的几何原语**，让「节点的位置/旋转/缩放/嵌套」不再散落成 `x/y/rotation/scaleX/scaleY` 一堆裸字段，而是收敛到一个可组合、可逆、可缓存的对象模型。

它是 `render`（坐标变换、命中测试）、`stage`（transformer 的 move/resize/rotate）、`schema`（migration 把 `x/y/rotation` 折叠成 `matrix`）三层的共同地基。

---

## 2. 架构画像

- **`Matrix`**（`matrix.ts`）：2D 仿射矩阵（a/b/c/d/tx/ty），链式 API（`append/prepend/translate/rotate/scale/invert/divide`），并提供 `applyXY/applyAABB/applyShift` 的坐标变换工具。是整层的基础类型。
- **`MRect`**（`mrect.ts`）：Matrix Rect，把「宽高 + 局部矩阵」打包成一个可变对象，并懒计算派生量（`x/y/rotation/center/vertices/aabb`），setter 触发 `expired()` 失效缓存。这是这一层的核心抽象。
- **`point.ts`**：构造 `S.Point` 与规则图形（直线/正多边形/星形）的顶点生成。
- **`bezier/`**：贝塞尔参数方程、中点、分割，以及曲线转折线（`pointsOnBezierCurves`，带 RDP 简化）。
- **`base.ts`**：`Math.*` 的再导出 + 几个语义化包装（`divide` 防 0、`pow2/pow3`）。

`migration.ts` 里那条「对 frame/rect/... 新增 matrix 属性」的迁移，本质上就是**把旧的 `x/y/rotation` 几何模型升级成 `MRect` 模型**。这说明作者明确把矩阵化当成一次有意识的数据模型演进，而不是随手加字段。

---

## 3. 成立的部分

### 3.1 `MRect` 是这一层最成功的抽象

把几何表示成 `(width, height, matrix)` 而不是 `(x, y, w, h, rotation, scaleX, scaleY, flipX, flipY)`，是一个成熟设计工具才会做的选择。它的收益在 `stage/tools/transformer.ts` 里体现得最清楚：

- 多选拖拽时，`diffMatrix` 是「选区整体的变换」，apply 到每个节点只是 `MRect.transform(diffMatrix)`；
- 单选 resize 时，又能用 `transform(diffMatrix, local=true)` 在局部空间应用；
- rotate 时基于 AABB center 构造旋转矩阵，再 divide 回去。

整套变换逻辑是**矩阵运算驱动**的，没有「按 shift 拖角点时分别算 dx/dy 再改 x/y/width」这种几何 ad-hoc 代码。这让 transformer 在数学上自洽，也容易扩展（比如未来加 skew）。

### 3.2 派生量懒计算 + 失效缓存，方向对

`MRect` 的 `_xy/_rotation/_center/_vertices/_aabb` 都是 `undefined` 起步，getter 时计算，setter 时 `expired()` 全部置空。这是命令式可变对象里非常合理的 memo 模式，避免了「改了 width 忘了重算 aabb」这类经典 bug。

配合 `render/elem.ts` 里 `memorized` 把 `mrect/aabb/globalMatrix/visible` 也 memo 化（按 deps 数组），整条「节点 → elem → AABB → 可见性」的派生链是缓存友好的。

### 3.3 `Matrix` 作为纯函数 + 链式的混合体，平衡得当

`Matrix` 既是 class（可 `of/from/identity` 构造、可链式 mutate），又提供 `plain/isFlipped/vector` 静态工具。`applyAABB` 用四角变换再取 min/max 算外包络，对旋转后的 AABB 是正确的。

`divide` = `append(invert(other))` 这个命名也很直觉，让 `diffMatrix = end.divide(start)` 这种「相对变换」表达很自然。

---

## 4. 问题与风险

### 4.1 `MRect` 是可变对象，但被当值传来传去，存在「同一引用被多处改」的隐患 ⚠️

`MRect` 的所有操作（`shift/rotate/transform`）都 `return this`，强调链式 mutation。但调用方经常这么用：

- `handle/node.ts` 的 `getMRect(node)` 用 `createCache` 缓存，依赖列表是 `[node.width, node.height, node.matrix]`；
- `transformer.ts` 里 `onStartTransform` 把每个节点的 `MRect.of(node)` 存进 `mrectCache`，之后在 `applyToNode` 里又 `MRect.of(mrect)` 重新构造一份。

也就是说，**调用方其实是在反复 `MRect.of(...)` 拷贝来规避共享 mutation**。这说明 `MRect` 的「可变」属性没有真正被利用，反而带来了「谁持有的是同一份」的心智负担。

> 这跟 `packages/@gitborlando/geo` 里几何类型可能是不可变的取向不一致（项目约定里也推荐优先用 `@gitborlando/geo`）。如果 geo 包提供不可变几何类型，editor 内部这层 `MRect` 的存在价值需要重新评估——至少 `matrix.ts` 这种纯结构应当优先复用 geo 包。

### 4.2 `bezier.ts` 的命名/签名风格与 `points-of-bezier.ts` 完全脱节

`bezier.ts` 用的是 8 个裸参数（`p1x, p1y, p2x, p2y, a1x, a1y, a2x, a2y, t`）+ 自定义 `xy_*` helper；而 `points-of-bezier.ts` 用的是 `Point` 数组 + 标准 RDP 简化。两套代码风格完全不同，明显是不同时期拼进来的。

更要命的是 `bezier.ts` 的 `bezierParametricEquation` 里有一行明显笔误：

```ts
let [x, y] = bezierParametricEquation(p1x, p1x, p2x, p2y, ...)  // 第二个参数应是 p1y
```

`bezierMidpoint` 里同样的错误。这说明这套函数目前**没有被任何路径真正用到/测试过**（搜索 import 会发现 `draw.ts` 只用了 `points-of-bezier` 的 `pointsOnBezierCurves`）。属于死代码 + 潜在 bug，建议直接删 `bezier.ts`，或重写成和 `points-of-bezier` 一致的风格。

### 4.3 `base.ts` 的 `divide` 防零返回 `1` 是危险默认值

```ts
export function divide(a, b) {
  return b === 0 ? 1 : a / b
}
```

「除零返回 1」会让 `geometry.ts` 里 `deltaRate = divide(delta, node.width)` 在 `width=0`（比如 line 节点）时静默得到一个错误比例，而不是抛错。对几何计算来说，「悄悄算错」比「直接炸」更难查。这种全局兜底应该去掉，由调用方显式处理 0 除。

### 4.4 `point.ts` 的图形生成函数耦合了 schema

`createRegularPolygon/createStarPolygon/createLine` 返回的是 `S.Point[]`（带 `id/type/symmetric` 的 schema 点），而不是纯几何点。这让它们没法被纯几何测试覆盖，也没法在非 schema 上下文复用。更干净的做法是返回 `IXY[]`，由 `schema/creator.ts` 负责包成 `S.Point`。

### 4.5 `createRegularPolygon` 有一个明显笔误

```ts
const center = XY.$(width / 2, width / 2) // 第二项应是 height / 2
const radius = width / 2
```

正多边形的中心 y 用了 `width/2`，对非正方形（width≠height）的多边形会导致中心偏移。同样属于「没被测试/没被非正方形用例覆盖」的信号。

---

## 5. 方向建议

1. **保留 `Matrix` 和 `MRect` 的核心模型**，但明确：`MRect` 要么彻底不可变（每次操作返回新实例），要么明确「谁负责 clone」。当前「可变 + 调用方到处 of() 拷贝」是最差的中间态。
2. **几何类型优先复用 `@gitborlando/geo`**，editor 内只保留 geo 包没有的部分（MRect 这个「宽高+矩阵」的复合概念 geo 包未必有）。
3. **删除 `bezier.ts` 死代码**，或与 `points-of-bezier` 统一风格并补一个最小测试。
4. **去掉 `base.ts` 的静默兜底**（`divide` 返回 1），让几何错误尽早暴露。
5. **`point.ts` 的图形生成函数只返回 `IXY[]`**，把 schema 包装下放到 creator。

---

## 小结

这一层是 Sigma 真正的资产所在。它选对了「矩阵化几何」这条难而正确的路，并且 `MRect` 的懒失效缓存和 transformer 的矩阵驱动变换已经证明了这条路走得通。剩下的债基本是「可变 vs 不可变没定清楚」和「夹了点死代码/笔误」，属于整理成本，不是架构成本。
