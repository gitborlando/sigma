// ==========================================
// 1. 常量与配置定义
// ==========================================
const INITIAL_CAPACITY = 1024
const GROWTH_FACTOR = 1.5 // 每次扩容 1.5 倍

// 类型映射
const TYPE_MAP = { a: 0, b: 1 }
const TYPE_MAP_REV = ['a', 'b']

// 位掩码 (Bitmask) - 用一个字节存储多个状态
const FLAGS = {
  ACTIVE: 1 << 0, // 00000001
  VISIBLE: 1 << 1, // 00000010
  COLLIDED: 1 << 2, // 00000100
  LOCKED: 1 << 3, // 00001000
}

// ==========================================
// 2. 游标类 (Cursor) - 零 GC 的访问接口
// ==========================================
// 这个类就像一个“镜头”，对准哪个索引，就能操作那个位置的数据
class EntityCursor {
  constructor(manager, index) {
    this.m = manager // 引用管理器
    this.i = index // 当前指向的索引
  }

  // --- 移动镜头 ---
  seek(index) {
    this.i = index
    return this
  }

  // --- 属性访问器 (Getters/Setters) ---
  get x() {
    return this.m.x[this.i]
  }
  set x(v) {
    this.m.x[this.i] = v
  }

  get y() {
    return this.m.y[this.i]
  }
  set y(v) {
    this.m.y[this.i] = v
  }

  get vx() {
    return this.m.vx[this.i]
  }
  set vx(v) {
    this.m.vx[this.i] = v
  }

  get vy() {
    return this.m.vy[this.i]
  }
  set vy(v) {
    this.m.vy[this.i] = v
  }

  get type() {
    return TYPE_MAP_REV[this.m.type[this.i]]
  }
  set type(v) {
    this.m.type[this.i] = TYPE_MAP[v]
  }

  // 访问嵌套属性 in.x
  get inX() {
    return this.m.in_x[this.i]
  }
  set inX(v) {
    this.m.in_x[this.i] = v
  }

  get inY() {
    return this.m.in_y[this.i]
  }
  set inY(v) {
    this.m.in_y[this.i] = v
  }

  // --- 位操作封装 ---
  get isVisible() {
    return (this.m.flags[this.i] & FLAGS.VISIBLE) !== 0
  }
  set isVisible(v) {
    if (v) this.m.flags[this.i] |= FLAGS.VISIBLE
    else this.m.flags[this.i] &= ~FLAGS.VISIBLE
  }
}

// ==========================================
// 3. 核心管理器 (SoA Manager)
// ==========================================
class EntityManager {
  constructor(capacity = INITIAL_CAPACITY) {
    this.count = 0 // 当前实际元素数量
    this.capacity = capacity // 当前最大容量
    this._allocate(capacity) // 分配内存

    // 创建一个可复用的游标，避免循环中产生 GC
    this._cursor = new EntityCursor(this, 0)
  }

  /**
   * 分配或重新分配内存
   */
  _allocate(cap) {
    // 创建新 Buffer
    const newBuffers = {
      x: new Float32Array(cap),
      y: new Float32Array(cap),
      vx: new Float32Array(cap),
      vy: new Float32Array(cap),
      in_x: new Float32Array(cap),
      in_y: new Float32Array(cap),
      type: new Uint8Array(cap),
      flags: new Uint8Array(cap),
      id: new Uint32Array(cap),
    }

    // 如果是扩容，需要把旧数据搬过去
    if (this.x) {
      // TypedArray.set() 是系统级内存拷贝，速度极快
      newBuffers.x.set(this.x)
      newBuffers.y.set(this.y)
      newBuffers.vx.set(this.vx)
      newBuffers.vy.set(this.vy)
      newBuffers.in_x.set(this.in_x)
      newBuffers.in_y.set(this.in_y)
      newBuffers.type.set(this.type)
      newBuffers.flags.set(this.flags)
      newBuffers.id.set(this.id)
    }

    // 挂载到实例上
    Object.assign(this, newBuffers)
    this.capacity = cap
  }

  /**
   * 自动扩容检查
   */
  _ensureCapacity(minCount) {
    if (minCount > this.capacity) {
      const newCap = Math.floor(this.capacity * GROWTH_FACTOR)
      console.warn(`[System] Resizing buffer: ${this.capacity} -> ${newCap}`)
      this._allocate(newCap)
    }
  }

  /**
   * 添加实体
   */
  add(data) {
    const i = this.count
    this._ensureCapacity(i + 1)

    this.x[i] = data.x
    this.y[i] = data.y
    this.vx[i] = data.vx || 0
    this.vy[i] = data.vy || 0
    this.type[i] = TYPE_MAP[data.type]
    this.in_x[i] = data.in?.x || 0
    this.in_y[i] = data.in?.y || 0
    this.id[i] = data.id || Math.random() * 100000

    // 默认设置为 Active 和 Visible
    this.flags[i] = FLAGS.ACTIVE | FLAGS.VISIBLE

    this.count++
    return i // 返回索引
  }

  /**
   * O(1) 删除 - Swap & Pop
   * 把最后一个元素移到被删除的位置，然后 count--
   */
  remove(index) {
    if (index >= this.count) return

    const last = this.count - 1

    // 如果删除的不是最后一个，就把最后一个搬过来覆盖它
    if (index !== last) {
      this.x[index] = this.x[last]
      this.y[index] = this.y[last]
      this.vx[index] = this.vx[last]
      this.vy[index] = this.vy[last]
      this.in_x[index] = this.in_x[last]
      this.in_y[index] = this.in_y[last]
      this.type[index] = this.type[last]
      this.flags[index] = this.flags[last]
      this.id[index] = this.id[last]
    }

    this.count--
  }

  /**
   * 获取迭代器 (允许使用 for...of)
   * 注意：为了性能，这里复用了同一个 cursor 对象！
   * 在循环中不要把 cursor 存下来，因为它是变的。
   */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.count; i++) {
      this._cursor.i = i
      yield this._cursor
    }
  }

  /**
   * 物理系统更新 (最核心的高性能循环)
   * 只有在这里，我们不使用 Cursor，而是直接操作数组
   */
  updatePhysics(dt) {
    // 提取引用到局部变量，减少 lookup 开销
    const count = this.count
    const x = this.x
    const y = this.y
    const vx = this.vx
    const vy = this.vy
    const inX = this.in_x

    for (let i = 0; i < count; i++) {
      // 简单的物理公式: x = x + v * dt + offset
      x[i] += vx[i] * dt + inX[i] * 0.01
      y[i] += vy[i] * dt

      // 边界反弹逻辑 (简化版)
      if (x[i] > 1000 || x[i] < 0) vx[i] *= -1
      if (y[i] > 1000 || y[i] < 0) vy[i] *= -1
    }
  }
}

// ==========================================
// 4. 实战演示
// ==========================================

// 初始化管理器
const system = new EntityManager(10) // 初始只给10个空间，测试扩容

console.log('--- 1. 批量添加数据 (触发扩容) ---')
// 添加 20 个实体
for (let i = 0; i < 1000000; i++) {
  system.add({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    type: i % 2 === 0 ? 'a' : 'b',
    in: { x: 5, y: 5 },
  })
}
console.log(`当前实体数量: ${system.count}, 容量: ${system.capacity}`)

console.log('\n--- 2. 使用 Cursor 访问 ---')
// 使用临时 Cursor 访问第 5 个元素
const tempCursor = new EntityCursor(system, 5)
console.log(
  `ID: ${system.id[5]}, Type: ${tempCursor.type}, Visible: ${tempCursor.isVisible}`,
)

// 修改标志位
tempCursor.isVisible = false
console.log(`修改后 Visible: ${tempCursor.isVisible} (Raw Flag: ${system.flags[5]})`)

console.log('\n--- 3. 运行物理循环 (高性能模式) ---')
console.time('Physics Update')
// 模拟跑 10000 帧
for (let frame = 0; frame < 1; frame++) {
  system.updatePhysics(0.016) // 16ms delta time
}
console.timeEnd('Physics Update')
console.log(
  `ID 5 的新坐标: x=${system.x[5].toFixed(2)}, y=${system.y[5].toFixed(2)}`,
)

console.log('\n--- 4. Swap-and-Pop 删除测试 ---')
console.log(
  `删除前 ID 序列: [0]=${system.id[0]}, [1]=${system.id[1]} ... [Last]=${system.id[system.count - 1]}`,
)

// 删除索引为 0 的元素
system.remove(0)

console.log(`删除后 ID 序列: [0]=${system.id[0]}`)
// 预期: 原来最后一个元素现在的 ID 应该出现在位置 0
console.log(`当前数量: ${system.count}`)

console.log('\n--- 5. 迭代器测试 ---')
let visibleCount = 0
// 这种写法很舒服，但在极高性能敏感区域建议用原始 for 循环
for (const entity of system) {
  if (entity.isVisible) {
    visibleCount++
  }
}
console.log(`可见实体数量: ${visibleCount}`)
