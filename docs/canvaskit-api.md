# CanvasKit API 中文文档

CanvasKit 是 Google 开发的 Skia 图形库的 WebAssembly 版本，提供了高性能的 2D 图形渲染能力。

## 目录

- [初始化](#初始化)
- [Canvas 画布](#canvas-画布)
- [Paint 画笔](#paint-画笔)
- [Path 路径](#path-路径)
- [Matrix 矩阵变换](#matrix-矩阵变换)
- [Text 文本](#text-文本)
- [Image 图像](#image-图像)
- [Shader 着色器](#shader-着色器)
- [Filter 滤镜](#filter-滤镜)
- [Surface 渲染表面](#surface-渲染表面)

---

## 初始化

### 加载 CanvasKit

```typescript
import CanvasKitInit from 'canvaskit-wasm'

// 基础加载
const CanvasKit = await CanvasKitInit()

// 自定义 WASM 路径
const CanvasKit = await CanvasKitInit({
  locateFile: (file) => '/path/to/' + file,
})
```

### 创建 Surface

```typescript
// 从 Canvas 元素创建
const surface = CanvasKit.MakeCanvasSurface('canvas-id')

// 或使用 HTMLCanvasElement
const canvas = document.getElementById('my-canvas')
const surface = CanvasKit.MakeCanvasSurface(canvas)

// 创建离屏 Surface
const surface = CanvasKit.MakeSurface(width, height)
```

---

## Canvas 画布

Canvas 是绘图的核心对象，所有绘图操作都在 Canvas 上进行。

### 获取 Canvas

```typescript
const canvas = surface.getCanvas()
```

### 清空和保存

```typescript
// 清空画布（透明）
canvas.clear(CanvasKit.TRANSPARENT)

// 清空画布（指定颜色）
canvas.clear(CanvasKit.Color(255, 255, 255, 1.0))

// 保存当前状态
canvas.save()

// 恢复到上次保存的状态
canvas.restore()

// 保存当前状态并返回层级
const saveCount = canvas.getSaveCount()
```

### 绘制基础图形

#### 绘制矩形

```typescript
const paint = new CanvasKit.Paint()
paint.setColor(CanvasKit.Color(255, 0, 0, 1.0))
paint.setStyle(CanvasKit.PaintStyle.Fill)

// 绘制矩形
canvas.drawRect(CanvasKit.LTRBRect(left, top, right, bottom), paint)

// 绘制圆角矩形
canvas.drawRRect(
  CanvasKit.RRectXY(CanvasKit.LTRBRect(left, top, right, bottom), radiusX, radiusY),
  paint,
)
```

#### 绘制圆形和椭圆

```typescript
// 绘制圆形
canvas.drawCircle(centerX, centerY, radius, paint)

// 绘制椭圆
canvas.drawOval(CanvasKit.LTRBRect(left, top, right, bottom), paint)

// 绘制弧形
canvas.drawArc(
  CanvasKit.LTRBRect(left, top, right, bottom),
  startAngle, // 起始角度（度）
  sweepAngle, // 扫过角度（度）
  useCenter, // 是否连接到中心点
  paint,
)
```

#### 绘制路径

```typescript
const path = new CanvasKit.Path()
path.moveTo(x, y)
path.lineTo(x2, y2)
path.close()

canvas.drawPath(path, paint)
```

#### 绘制线段

```typescript
// 绘制单条线
canvas.drawLine(x1, y1, x2, y2, paint)

// 绘制多条线段
const points = [x1, y1, x2, y2, x3, y3, x4, y4]
canvas.drawPoints(
  CanvasKit.PointMode.Lines, // Lines, Points, Polygon
  points,
  paint,
)
```

### 变换操作

```typescript
// 平移
canvas.translate(dx, dy)

// 缩放
canvas.scale(sx, sy)

// 旋转（弧度）
canvas.rotate(angleInRadians, pivotX, pivotY)

// 倾斜
canvas.skew(sx, sy)

// 应用矩阵
const matrix = CanvasKit.Matrix.multiply(
  CanvasKit.Matrix.rotated(angle),
  CanvasKit.Matrix.translated(x, y),
)
canvas.concat(matrix)

// 重置变换
canvas.resetMatrix.of()
```

### 裁剪

```typescript
// 矩形裁剪
canvas.clipRect(
  CanvasKit.LTRBRect(left, top, right, bottom),
  CanvasKit.ClipOp.Intersect, // 裁剪模式
  true, // 抗锯齿
)

// 路径裁剪
canvas.clipPath(path, CanvasKit.ClipOp.Intersect, true)

// 圆角矩形裁剪
canvas.clipRRect(rrect, CanvasKit.ClipOp.Intersect, true)
```

---

## Paint 画笔

Paint 对象定义了绘制的样式、颜色、混合模式等属性。

### 创建和基础设置

```typescript
const paint = new CanvasKit.Paint()

// 设置颜色（RGBA）
paint.setColor(CanvasKit.Color(255, 0, 0, 1.0))

// 设置颜色（Float4）
paint.setColorComponents(1.0, 0.0, 0.0, 1.0)

// 设置透明度
paint.setAlphaf(0.5)

// 设置绘制模式
paint.setStyle(CanvasKit.PaintStyle.Fill) // 填充
paint.setStyle(CanvasKit.PaintStyle.Stroke) // 描边
```

### 描边设置

```typescript
// 描边宽度
paint.setStrokeWidth(2.0)

// 线帽样式
paint.setStrokeCap(CanvasKit.StrokeCap.Butt) // 平头
paint.setStrokeCap(CanvasKit.StrokeCap.Round) // 圆头
paint.setStrokeCap(CanvasKit.StrokeCap.Square) // 方头

// 线段连接样式
paint.setStrokeJoin(CanvasKit.StrokeJoin.Miter) // 尖角
paint.setStrokeJoin(CanvasKit.StrokeJoin.Round) // 圆角
paint.setStrokeJoin(CanvasKit.StrokeJoin.Bevel) // 斜角

// 斜接限制
paint.setStrokeMiter(4.0)
```

### 抗锯齿

```typescript
// 启用抗锯齿
paint.setAntiAlias(true)
```

### 混合模式

```typescript
paint.setBlendMode(CanvasKit.BlendMode.SrcOver) // 正常
paint.setBlendMode(CanvasKit.BlendMode.Multiply) // 正片叠底
paint.setBlendMode(CanvasKit.BlendMode.Screen) // 滤色
paint.setBlendMode(CanvasKit.BlendMode.Overlay) // 叠加
paint.setBlendMode(CanvasKit.BlendMode.Darken) // 变暗
paint.setBlendMode(CanvasKit.BlendMode.Lighten) // 变亮
// ... 更多混合模式
```

### 着色器

```typescript
// 设置线性渐变
const shader = CanvasKit.Shader.MakeLinearGradient(
  [startX, startY], // 起点
  [endX, endY], // 终点
  [color1, color2, color3], // 颜色数组
  [0.0, 0.5, 1.0], // 位置数组（可选）
  CanvasKit.TileMode.Clamp, // 平铺模式
)
paint.setShader(shader)

// 设置径向渐变
const shader = CanvasKit.Shader.MakeRadialGradient(
  [centerX, centerY], // 中心点
  radius, // 半径
  [color1, color2], // 颜色数组
  [0.0, 1.0], // 位置数组
  CanvasKit.TileMode.Clamp,
)
paint.setShader(shader)

// 设置角度渐变
const shader = CanvasKit.Shader.MakeSweepGradient(
  centerX,
  centerY,
  [color1, color2],
  [0.0, 1.0],
  CanvasKit.TileMode.Clamp,
  startAngle, // 可选
  endAngle, // 可选
)
paint.setShader(shader)
```

### 滤镜

```typescript
// 设置图像滤镜（模糊）
const imageFilter = CanvasKit.ImageFilter.MakeBlur(
  sigmaX,
  sigmaY,
  CanvasKit.TileMode.Clamp,
  null,
)
paint.setImageFilter(imageFilter)

// 设置颜色滤镜
const colorFilter = CanvasKit.ColorFilter.MakeBlend(
  CanvasKit.Color(255, 0, 0),
  CanvasKit.BlendMode.Multiply,
)
paint.setColorFilter(colorFilter)

// 设置遮罩滤镜
const maskFilter = CanvasKit.MaskFilter.MakeBlur(
  CanvasKit.BlurStyle.Normal,
  sigma,
  respectCTM,
)
paint.setMaskFilter(maskFilter)
```

### 路径效果

```typescript
// 虚线效果
const pathEffect = CanvasKit.PathEffect.MakeDash(
  [dashLength, gapLength], // 虚线模式
  phase, // 偏移
)
paint.setPathEffect(pathEffect)

// 离散路径效果
const pathEffect = CanvasKit.PathEffect.MakeDiscrete(
  segLength,
  deviation,
  seedAssist,
)
paint.setPathEffect(pathEffect)

// 组合路径效果
const pathEffect = CanvasKit.PathEffect.MakeCompose(effect1, effect2)
paint.setPathEffect(pathEffect)
```

### 释放资源

```typescript
paint.delete()
```

---

## Path 路径

Path 对象用于创建复杂的矢量路径。

### 创建路径

```typescript
const path = new CanvasKit.Path()

// 从 SVG 路径字符串创建
const path = CanvasKit.Path.MakeFromSVGString('M 0 0 L 100 100')

// 从操作创建
const path = CanvasKit.Path.MakeFromOp(path1, path2, CanvasKit.PathOp.Union)
```

### 基础路径命令

```typescript
// 移动到点
path.moveTo(x, y)

// 直线到点
path.lineTo(x, y)

// 二次贝塞尔曲线
path.quadTo(cpx, cpy, x, y)

// 三次贝塞尔曲线
path.cubicTo(cp1x, cp1y, cp2x, cp2y, x, y)

// 圆弧
path.arcToTangent(x1, y1, x2, y2, radius)
path.arcToOval(
  CanvasKit.LTRBRect(left, top, right, bottom),
  startAngle,
  sweepAngle,
  forceMoveTo,
)

// 闭合路径
path.close()
```

### 添加图形

```typescript
// 添加矩形
path.addRect(CanvasKit.LTRBRect(left, top, right, bottom))

// 添加圆角矩形
path.addRRect(rrect, isCCW)

// 添加圆形
path.addCircle(x, y, radius, isCCW)

// 添加椭圆
path.addOval(CanvasKit.LTRBRect(left, top, right, bottom), isCCW)

// 添加弧形
path.addArc(CanvasKit.LTRBRect(left, top, right, bottom), startAngle, sweepAngle)

// 添加多边形
const points = [x1, y1, x2, y2, x3, y3]
path.addPoly(points, close)

// 添加另一个路径
path.addPath(otherPath, extendPath)
```

### 路径变换

```typescript
// 变换路径
path.transform(matrix)

// 偏移路径
path.offset(dx, dy)
```

### 路径操作

```typescript
// 布尔运算
const result = CanvasKit.Path.MakeFromOp(
  path1,
  path2,
  CanvasKit.PathOp.Union, // 并集
)
// 其他操作：
// PathOp.Difference    // 差集
// PathOp.Intersect     // 交集
// PathOp.XOR           // 异或
// PathOp.ReverseDifference // 反向差集

// 简化路径
path.simplify()
```

### 路径信息

```typescript
// 获取边界
const bounds = path.getBounds() // [left, top, right, bottom]

// 获取路径填充类型
path.getFillType()

// 设置路径填充类型
path.setFillType(CanvasKit.FillType.Winding)
path.setFillType(CanvasKit.FillType.EvenOdd)

// 判断点是否在路径内
const contains = path.contains(x, y)

// 获取路径长度
const length = path.length()

// 判断路径是否为空
const isEmpty = path.isEmpty()
```

### 路径迭代

```typescript
// 获取路径命令
const cmds = path.toCmds()
// 返回格式：[[verb, ...args], ...]

// 转换为 SVG 路径字符串
const svgString = path.toSVGString()
```

### 释放资源

```typescript
path.delete()
```

---

## Matrix 矩阵变换

### 创建矩阵

```typescript
// 单位矩阵
const matrix = CanvasKit.Matrix.identity()

// 平移矩阵
const matrix = CanvasKit.Matrix.translated(dx, dy)

// 缩放矩阵
const matrix = CanvasKit.Matrix.scaled(sx, sy)

// 旋转矩阵（弧度）
const matrix = CanvasKit.Matrix.rotated(angleInRadians, pivotX, pivotY)

// 倾斜矩阵
const matrix = CanvasKit.Matrix.skewed(sx, sy, pivotX, pivotY)
```

### 矩阵运算

```typescript
// 矩阵相乘
const result = CanvasKit.Matrix.multiply(matrix1, matrix2)

// 矩阵求逆
const inverted = CanvasKit.Matrix.invert(matrix)

// 映射点
const [newX, newY] = CanvasKit.Matrix.mapPoints(matrix, [x, y])
```

### 自定义矩阵

```typescript
// 3x3 矩阵
const matrix = [scaleX, skewX, transX, skewY, scaleY, transY, persp0, persp1, persp2]
```

---

## Text 文本

### 字体管理

```typescript
// 加载字体
const fontData = await fetch('font.ttf').then((r) => r.arrayBuffer())
const fontMgr = CanvasKit.FontMgr.FromData(fontData)

// 创建字体
const typeface = fontMgr.MakeTypefaceFromData(fontData)

// 创建 Font 对象
const font = new CanvasKit.Font(typeface, fontSize)

// 设置字体属性
font.setSize(fontSize)
font.setScaleX(1.0) // 水平缩放
font.setSkewX(0.0) // 倾斜
font.setLinearMetrics(false)
font.setEmbolden(false) // 加粗
```

### 绘制文本

```typescript
const paint = new CanvasKit.Paint()
paint.setColor(CanvasKit.Color(0, 0, 0, 1.0))
paint.setAntiAlias(true)

// 绘制简单文本
canvas.drawText('Hello World', x, y, paint, font)

// 绘制带变换的文本
canvas.drawText('Hello World', x, y, paint, font)
```

### 文本测量

```typescript
// 测量文本宽度
const glyphs = font.getGlyphIDs('Hello World')
const widths = font.getGlyphWidths(glyphs)

// 获取文本边界
const bounds = font.getGlyphBounds(glyphs)

// 获取字体度量信息
const metrics = font.getMetrics()
// 返回：{ ascent, descent, leading, ... }
```

### 文本整形

```typescript
// 使用 ShapedText（需要 HarfBuzz）
const shapedText = CanvasKit.ShapedText.MakeShapedText(
  'Hello World',
  font,
  leftToRight,
)

// 绘制整形后的文本
canvas.drawShapedText(shapedText, x, y, paint)

// 获取整形后的文本信息
const bounds = shapedText.getBounds()
```

### Paragraph 段落（高级文本布局）

```typescript
// 创建段落样式
const paraStyle = new CanvasKit.ParagraphStyle({
  textAlign: CanvasKit.TextAlign.Left,
  textDirection: CanvasKit.TextDirection.LTR,
  maxLines: 10,
  ellipsis: '...',
})

// 创建文本样式
const textStyle = new CanvasKit.TextStyle({
  color: CanvasKit.Color(0, 0, 0, 1.0),
  fontSize: 16,
  fontFamilies: ['Arial'],
  fontStyle: {
    weight: CanvasKit.FontWeight.Normal,
    width: CanvasKit.FontWidth.Normal,
    slant: CanvasKit.FontSlant.Upright,
  },
  decoration: CanvasKit.TextDecoration.Underline,
  decorationColor: CanvasKit.Color(255, 0, 0, 1.0),
})

// 创建段落构建器
const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr)

// 添加文本
builder.pushStyle(textStyle)
builder.addText('Hello World')
builder.pop()

// 构建段落
const paragraph = builder.build()

// 布局段落
paragraph.layout(maxWidth)

// 绘制段落
canvas.drawParagraph(paragraph, x, y)

// 获取段落信息
const height = paragraph.getHeight()
const longestLine = paragraph.getLongestLine()
const lineMetrics = paragraph.getLineMetrics()
```

---

## Image 图像

### 加载图像

```typescript
// 从 ArrayBuffer 加载
const imageData = await fetch('image.png').then((r) => r.arrayBuffer())
const image = CanvasKit.MakeImageFromEncoded(imageData)

// 从 Canvas 元素创建
const canvas = document.getElementById('my-canvas')
const snapshot = surface.makeImageSnapshot()
```

### 绘制图像

```typescript
const paint = new CanvasKit.Paint()

// 绘制完整图像
canvas.drawImage(image, left, top, paint)

// 绘制图像的部分区域
canvas.drawImageRect(
  image,
  CanvasKit.LTRBRect(srcLeft, srcTop, srcRight, srcBottom), // 源区域
  CanvasKit.LTRBRect(dstLeft, dstTop, dstRight, dstBottom), // 目标区域
  paint,
  false, // 使用快速采样
)

// 使用九宫格绘制
canvas.drawImageNine(
  image,
  CanvasKit.LTRBiRect(centerLeft, centerTop, centerRight, centerBottom),
  CanvasKit.LTRBRect(dstLeft, dstTop, dstRight, dstBottom),
  paint,
)
```

### 图像信息

```typescript
// 获取图像宽高
const width = image.width()
const height = image.height()

// 获取图像数据
const imageInfo = image.makeShader(
  CanvasKit.TileMode.Clamp,
  CanvasKit.TileMode.Clamp,
)
```

### 释放资源

```typescript
image.delete()
```

---

## Shader 着色器

### 线性渐变

```typescript
const shader = CanvasKit.Shader.MakeLinearGradient(
  [startX, startY], // 起点
  [endX, endY], // 终点
  [color1, color2, color3], // 颜色数组
  [0.0, 0.5, 1.0], // 颜色位置（可选）
  CanvasKit.TileMode.Clamp, // 平铺模式
  matrix, // 变换矩阵（可选）
  0, // 标志位（可选）
)
```

### 径向渐变

```typescript
const shader = CanvasKit.Shader.MakeRadialGradient(
  [centerX, centerY], // 中心点
  radius, // 半径
  [color1, color2], // 颜色数组
  [0.0, 1.0], // 颜色位置
  CanvasKit.TileMode.Clamp,
  matrix,
  0,
)
```

### 双点圆锥渐变

```typescript
const shader = CanvasKit.Shader.MakeTwoPointConicalGradient(
  [startX, startY], // 起点
  startRadius, // 起点半径
  [endX, endY], // 终点
  endRadius, // 终点半径
  [color1, color2],
  [0.0, 1.0],
  CanvasKit.TileMode.Clamp,
  matrix,
  0,
)
```

### 角度渐变

```typescript
const shader = CanvasKit.Shader.MakeSweepGradient(
  centerX, // 中心 X
  centerY, // 中心 Y
  [color1, color2], // 颜色数组
  [0.0, 1.0], // 颜色位置
  CanvasKit.TileMode.Clamp,
  matrix,
  0,
  startAngle, // 起始角度（可选）
  endAngle, // 结束角度（可选）
)
```

### 图像着色器

```typescript
const shader = image.makeShader(
  CanvasKit.TileMode.Repeat, // X 轴平铺
  CanvasKit.TileMode.Repeat, // Y 轴平铺
  CanvasKit.FilterMode.Linear, // 过滤模式
  CanvasKit.MipmapMode.None, // Mipmap 模式
  matrix, // 变换矩阵（可选）
)
```

### 平铺模式

```typescript
CanvasKit.TileMode.Clamp // 边缘颜色延伸
CanvasKit.TileMode.Repeat // 重复平铺
CanvasKit.TileMode.Mirror // 镜像平铺
CanvasKit.TileMode.Decal // 边缘透明
```

### 组合着色器

```typescript
const shader = CanvasKit.Shader.MakeBlend(
  CanvasKit.BlendMode.Multiply,
  shader1,
  shader2,
)
```

---

## Filter 滤镜

### 图像滤镜

#### 模糊滤镜

```typescript
const filter = CanvasKit.ImageFilter.MakeBlur(
  sigmaX, // X 轴模糊半径
  sigmaY, // Y 轴模糊半径
  CanvasKit.TileMode.Clamp,
  null, // 输入滤镜（可选）
)
paint.setImageFilter(filter)
```

#### 矩阵颜色滤镜

```typescript
const colorMatrix = [
  1,
  0,
  0,
  0,
  0, // R
  0,
  1,
  0,
  0,
  0, // G
  0,
  0,
  1,
  0,
  0, // B
  0,
  0,
  0,
  1,
  0, // A
]
const filter = CanvasKit.ImageFilter.MakeColorFilter(
  CanvasKit.ColorFilter.MakeMatrix.of(colorMatrix),
  null,
)
paint.setImageFilter(filter)
```

#### 组合滤镜

```typescript
const filter = CanvasKit.ImageFilter.MakeCompose(filter1, filter2)
paint.setImageFilter(filter)
```

#### 阴影滤镜

```typescript
const filter = CanvasKit.ImageFilter.MakeDropShadow(
  dx, // X 偏移
  dy, // Y 偏移
  sigmaX, // X 模糊
  sigmaY, // Y 模糊
  color, // 阴影颜色
  null, // 输入滤镜
)
paint.setImageFilter(filter)

// 内阴影
const filter = CanvasKit.ImageFilter.MakeDropShadowOnly(
  dx,
  dy,
  sigmaX,
  sigmaY,
  color,
  null,
)
```

### 颜色滤镜

#### 混合颜色滤镜

```typescript
const filter = CanvasKit.ColorFilter.MakeBlend(
  CanvasKit.Color(255, 0, 0, 1.0),
  CanvasKit.BlendMode.Multiply,
)
paint.setColorFilter(filter)
```

#### 组合颜色滤镜

```typescript
const filter = CanvasKit.ColorFilter.MakeCompose(filter1, filter2)
paint.setColorFilter(filter)
```

#### 线性转灰度滤镜

```typescript
const filter = CanvasKit.ColorFilter.MakeLinearToSRGBGamma()
paint.setColorFilter(filter)
```

### 遮罩滤镜

```typescript
// 模糊遮罩
const filter = CanvasKit.MaskFilter.MakeBlur(
  CanvasKit.BlurStyle.Normal, // 模糊样式
  sigma, // 模糊半径
  respectCTM, // 是否受变换影响
)
paint.setMaskFilter(filter)

// 模糊样式
CanvasKit.BlurStyle.Normal // 正常模糊
CanvasKit.BlurStyle.Solid // 实心模糊
CanvasKit.BlurStyle.Outer // 外发光
CanvasKit.BlurStyle.Inner // 内发光
```

---

## Surface 渲染表面

### 创建 Surface

```typescript
// 从 Canvas 元素创建
const surface = CanvasKit.MakeCanvasSurface('canvas-id')
const surface = CanvasKit.MakeCanvasSurface(canvasElement)

// 创建离屏 Surface
const surface = CanvasKit.MakeSurface(width, height)

// 使用 WebGL
const surface = CanvasKit.MakeWebGLCanvasSurface('canvas-id')

// 指定颜色空间
const surface = CanvasKit.MakeSurface(width, height, CanvasKit.ColorSpace.SRGB)
```

### 渲染

```typescript
// 获取 Canvas
const canvas = surface.getCanvas()

// 执行绘制
canvas.clear(CanvasKit.WHITE)
// ... 绘制操作

// 刷新到屏幕
surface.flush()

// 制作快照
const image = surface.makeImageSnapshot()
const image = surface.makeImageSnapshot([x, y, width, height])
```

### 获取像素数据

```typescript
// 读取像素
const pixels = surface.makeImageSnapshot().readPixels(0, 0)
// 返回 Uint8Array，格式为 RGBA
```

### 释放资源

```typescript
surface.delete()
```

---

## 实用工具

### 颜色

```typescript
// 创建颜色
const color = CanvasKit.Color(r, g, b, a) // 0-255
const color = CanvasKit.Color4f(r, g, b, a) // 0.0-1.0

// 预定义颜色
CanvasKit.TRANSPARENT
CanvasKit.BLACK
CanvasKit.WHITE
CanvasKit.RED
CanvasKit.GREEN
CanvasKit.BLUE
// ...

// 从十六进制创建
const color = CanvasKit.parseColorString('#FF0000')
```

### 矩形

```typescript
// LTRB 格式（左上右下）
const rect = CanvasKit.LTRBRect(left, top, right, bottom)

// XYWH 格式
const rect = CanvasKit.XYWHRect(x, y, width, height)

// 整数矩形
const rect = CanvasKit.LTRBiRect(left, top, right, bottom)
```

### 圆角矩形

```typescript
// 统一圆角
const rrect = CanvasKit.RRectXY(rect, radiusX, radiusY)

// 独立圆角
const rrect = CanvasKit.RRectXY(
  rect,
  [tlX, tlY, trX, trY, brX, brY, blX, blY], // 左上、右上、右下、左下
)
```

### 性能优化

```typescript
// 使用对象池
const path = pathPool.acquire()
// ... 使用
pathPool.release(path)

// 批量绘制
canvas.drawVertices(
  CanvasKit.MakeVertices(
    CanvasKit.VertexMode.Triangles,
    positions,
    texCoords,
    colors,
    indices,
  ),
  CanvasKit.BlendMode.SrcOver,
  paint,
)

// 图片缓存
const cachedImage = CanvasKit.MakeImageFromEncoded(data)
// 重复使用 cachedImage
```

---

## 完整示例

### 基础绘制示例

```typescript
import CanvasKitInit from 'canvaskit-wasm'

async function main() {
  // 初始化 CanvasKit
  const CanvasKit = await CanvasKitInit()

  // 创建 Surface
  const surface = CanvasKit.MakeCanvasSurface('my-canvas')
  if (!surface) {
    console.error('Failed to create surface')
    return
  }

  const canvas = surface.getCanvas()

  // 创建 Paint
  const paint = new CanvasKit.Paint()
  paint.setAntiAlias(true)

  // 绘制渐变矩形
  const shader = CanvasKit.Shader.MakeLinearGradient(
    [0, 0],
    [200, 200],
    [CanvasKit.RED, CanvasKit.BLUE],
    null,
    CanvasKit.TileMode.Clamp,
  )
  paint.setShader(shader)
  canvas.drawRect(CanvasKit.XYWHRect(50, 50, 200, 200), paint)

  // 绘制圆形
  paint.setColor(CanvasKit.Color(0, 255, 0, 0.5))
  paint.setShader(null)
  canvas.drawCircle(200, 200, 50, paint)

  // 刷新
  surface.flush()

  // 清理
  paint.delete()
  shader.delete()
}

main()
```

### 动画示例

```typescript
async function animate() {
  const CanvasKit = await CanvasKitInit()
  const surface = CanvasKit.MakeCanvasSurface('my-canvas')
  const canvas = surface.getCanvas()

  const paint = new CanvasKit.Paint()
  paint.setAntiAlias(true)
  paint.setStyle(CanvasKit.PaintStyle.Fill)

  let rotation = 0

  function drawFrame() {
    canvas.clear(CanvasKit.WHITE)

    canvas.save()
    canvas.translate(200, 200)
    canvas.rotate(rotation, 0, 0)

    paint.setColor(CanvasKit.Color(255, 0, 0, 1.0))
    canvas.drawRect(CanvasKit.XYWHRect(-50, -50, 100, 100), paint)

    canvas.restore()

    surface.flush()

    rotation += 0.02
    requestAnimationFrame(drawFrame)
  }

  drawFrame()
}

animate()
```

---

## 常见问题

### 1. 如何处理高 DPI 屏幕？

```typescript
const dpr = window.devicePixelRatio
canvas.width = width * dpr
canvas.height = height * dpr
canvas.style.width = width + 'px'
canvas.style.height = height + 'px'

const surface = CanvasKit.MakeCanvasSurface(canvas)
const canvas2d = surface.getCanvas()
canvas2d.scale(dpr, dpr)
```

### 2. 如何提高性能？

- 使用 `canvas.save()` 和 `canvas.restore()` 而不是频繁创建新对象
- 重用 Paint、Path 等对象
- 使用 `surface.requestAnimationFrame()` 而不是原生的
- 只在必要时调用 `surface.flush()`
- 使用离屏渲染缓存复杂图形

### 3. 内存管理

```typescript
// 所有 CanvasKit 对象都需要手动释放
paint.delete()
path.delete()
shader.delete()
image.delete()
surface.delete()

// 或使用辅助函数
function withPaint(callback) {
  const paint = new CanvasKit.Paint()
  try {
    callback(paint)
  } finally {
    paint.delete()
  }
}
```

---

## 参考资源

- [CanvasKit 官方文档](https://skia.org/docs/user/modules/canvaskit/)
- [Skia 官方网站](https://skia.org/)
- [CanvasKit API 参考](https://github.com/google/skia/tree/main/modules/canvaskit)
- [在线示例](https://skia.org/docs/user/modules/canvaskit/#demos)
