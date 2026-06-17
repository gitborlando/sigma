# math 模块 review

范围：`apps/web/src/editor/math`

## 模块意图

`math` 是编辑器几何基础设施，负责：

- 数学基础函数。
- 2D affine matrix。
- Matrix Rect，即 `MRect`。
- 基础图形 points 生成。
- 贝塞尔曲线采样、简化和辅助计算。

对于画布编辑器来说，这一层应该尽可能纯、稳定、可测试。上层所有选择、对齐、变换、命中测试、渲染都依赖它。

## 架构评价

### 优点

- `Matrix` 封装了 affine transform，并提供 `append/prepend/invert/applyXY/applyAABB`，方向正确。
- `MRect` 把 `width/height/matrix` 包装成可计算 `x/y/rotation/center/vertices/aabb` 的对象，这正好服务 schema v2。
- `MRect.transform()` 尝试把变换吸收到 `width/height/matrix`，这是编辑器 resize/rotate 必需能力。
- `points-of-bezier.ts` 的采样与 RDP 简化比较完整，适合路径命中测试。
- `point.ts` 把 polygon/star/line 的点生成集中起来，避免散落在 creator 或 draw 层。

### 主要问题

#### 1. `math/bezier/bezier.ts` 引用了不存在的 `../xy`

`bezier.ts` 里：

```ts
import { xy_distance, xy_minus, xy_multiply, xy_plus_all } from '../xy'
```

但当前 `math` 目录没有 `xy.ts`。如果这个文件被引用，会直接失败。即使暂时没人用，也说明它是遗留代码或未迁移代码。

建议：如果不用，移动到 legacy 或删除；如果要用，改成基于 `XY` 的实现并补测试。

#### 2. `bezierMidpoint()` 有明显数学错误

里面调用：

```ts
bezierParametricEquation(p1x, p1x, p2x, p2y, ...)
```

第二个参数应该是 `p1y`，现在写成 `p1x`。

另外它计算 midpoint 的 `shift` 用的是 `length / 2 - i.subLength`，而不是累计长度。这并不能找曲线长度中点。

建议不要在核心 math 中保留这种未验证实现。曲线相关函数一旦被路径编辑使用，会制造非常难排查的问题。

#### 3. `Matrix.invert()` 没有处理 det 为 0

当 matrix 不可逆时，`1 / det` 会得到 Infinity，之后所有坐标都会污染。编辑器里 width/height 可能临时为 0，resize 也可能产生接近 0 的 scale。

建议：

- `invert()` 对 det 接近 0 做显式处理。
- 或提供 `tryInvert()`，调用方决定 fallback。

#### 4. `Matrix` 是 mutable class，调用方需要非常清楚

`shift/translate/scale/rotate/append/prepend/divide` 都会修改自身并返回 `this`。这让链式调用方便，但如果把同一个 Matrix 实例放进 observable 或 cache，容易被意外修改。

建议：

- 文档化：`Matrix` 是 mutable。
- 对 schema 写入统一使用 `plain()`。
- 对长期状态不要保存 Matrix 实例，保存 plain matrix。

#### 5. `append/prepend` 语义缺少说明

编辑器里矩阵顺序非常关键。当前 `append/prepend` 实现未配注释，调用方很容易写反，尤其在 parent matrix、scene matrix、local diff 之间。

建议在 `Matrix` 类上写短注释说明：

- `append(matrix)` 表示当前变换后接哪个变换。
- `prepend(matrix)` 表示哪个变换先作用。

最好补几个最小单测：平移后旋转、父子矩阵累积、invert roundtrip。

#### 6. `MRect.transform()` 对负缩放、flip、shear 的语义不够明确

`MRect.transform()` 通过变换后的前三个顶点距离计算 newWidth/newHeight，再用 scaleMatrix 从 matrix 中除掉 scale。这个思路可以处理常见 resize，但对以下情况需要明确：

- scaleX 或 scaleY 为负。
- 宽高接近 0。
- matrix 带 shear。
- flip 是否写入 `node.flip`，还是体现在 matrix determinant。

当前 schema v2 有 `flip` 字段，但这套 transform 没有看到 flip 语义。

建议先定义：编辑器是否允许负宽高？是否允许 matrix determinant < 0？flip 由 matrix 表达还是由 `flip` 字段表达？

#### 7. `point.ts` 的 line/polygon/star 与 matrix 模型要再收敛

`createLine(start, length)` 现在生成的是带绝对 start 的点；但如果 schema 节点已经由 matrix 定位，line points 更适合用局部坐标：`(0,0) -> (width,0)`。

`SchemaCreator.line()` 传了 rotation，但 `createLine()` 不使用，这是当前模型混杂的直接表现。

#### 8. `base.divide(a, b)` 在除零时返回 1 过于隐蔽

除零返回 1 可以避免崩溃，但会把错误变成看似合理的变换比例。几何层里这很危险。

建议：

- 对比例类除法，调用方自己决定 fallback。
- `divide()` 可以改名成 `safeDivide(a,b,fallback)`，显式传 fallback。

## 文件级评价

### `base.ts`

轻量，但 `divide()` 需要重看语义。数学基础函数最好不要替调用方隐藏异常条件。

### `matrix.ts`

是正确的核心抽象。建议补不可逆处理、顺序注释和最小测试。

### `mrect.ts`

方向非常好，是 schema v2 的关键支点。建议围绕 resize、rotate、nested matrix、flip、zero size 补测试。

### `point.ts`

适合作为图形默认点生成层，但需要统一局部坐标模型。line 目前尤其需要修。

### `bezier/points-of-bezier.ts`

相对独立且可用，适合作为路径采样工具。建议补来源/license 注释和基础测试。

### `bezier/bezier.ts`

当前更像遗留草稿，不建议作为 active 模块继续留在核心目录。要么修正依赖和数学逻辑，要么移出 active path。

## 建议优先级

1. 修复或隔离 `bezier.ts`。
2. 给 `Matrix/MRect` 补核心测试。
3. 明确 flip、负 scale、zero size 的 schema 语义。
4. 将 vector points 统一为局部坐标。
5. 替换隐式 `divide()` fallback。
