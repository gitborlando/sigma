// ==========================================
// 1. 常量与配置
// ==========================================
// 即使是普通对象，我们也保留位掩码，因为这是业务逻辑的一部分
const FLAGS = {
  ACTIVE: 1 << 0,
  VISIBLE: 1 << 1,
  COLLIDED: 1 << 2,
  LOCKED: 1 << 3,
}

// ==========================================
// 2. 核心管理器 (Object Manager)
// ==========================================
class ObjectEntityManager {
  constructor() {
    // 这是一个普通的 JS 数组，存放对象引用
    this.entities = []
  }

  /**
   * 添加实体
   * 这里的开销在于：每次都要 new 两个对象 (entity 和 entity.in)
   */
  add(data) {
    // 创建对象 (V8 会尝试创建 Hidden Class)
    const entity = {
      x: data.x,
      y: data.y,
      vx: data.vx || 0,
      vy: data.vy || 0,
      type: data.type, // 直接存字符串 'a' | 'b'
      id: data.id || Math.random() * 100000,

      // 嵌套对象 (堆内存中的另一块碎片)
      in: {
        x: data.in?.x || 0,
        y: data.in?.y || 0,
      },

      // 标志位
      flags: FLAGS.ACTIVE | FLAGS.VISIBLE,
    }

    this.entities.push(entity)
    return this.entities.length - 1
  }

  /**
   * O(1) 删除 - Swap & Pop
   * 即使是对象数组，也可以用这个技巧避免 splice 的 O(N) 开销
   */
  remove(index) {
    const lastIndex = this.entities.length - 1

    if (index >= this.entities.length) return

    // 如果不是最后一个，就把最后一个元素移过来覆盖
    if (index !== lastIndex) {
      this.entities[index] = this.entities[lastIndex]
    }

    // 移除末尾 (改变数组长度)
    this.entities.pop()
  }

  /**
   * 物理系统更新
   * 这里的开销在于：指针跳转 (Pointer Chasing)
   */
  updatePhysics(dt) {
    // 缓存 length，避免每次访问
    const count = this.entities.length
    const items = this.entities

    for (let i = 0; i < count; i++) {
      const e = items[i] // 获取对象引用

      // 访问 e.x -> 内存跳跃
      // 访问 e.in.x -> 二次内存跳跃
      e.x += e.vx * dt + e.in.x * 0.01
      e.y += e.vy * dt

      // 边界反弹
      if (e.x > 1000 || e.x < 0) e.vx *= -1
      if (e.y > 1000 || e.y < 0) e.vy *= -1
    }
  }

  // 迭代器：普通数组原生支持，直接返回自身即可
  [Symbol.iterator]() {
    return this.entities[Symbol.iterator]()
  }
}

// ==========================================
// 3. 实战演示 (与 SoA 版本完全一致)
// ==========================================

const system = new ObjectEntityManager()

console.log('--- 1. 批量添加数据 ---')
// 模拟之前的扩容行为，这里只是 push
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
console.log(`当前实体数量: ${system.entities.length}`)

console.log('\n--- 2. 直接对象访问 (无需 Cursor) ---')
// 普通对象的最大优势：不用 Cursor，直接取就是对象
// 但要注意：这个变量 e 只是一个引用
const e = system.entities[5]
// 模拟之前的属性访问
const isVisible = (e.flags & FLAGS.VISIBLE) !== 0
console.log(`ID: ${e.id}, Type: ${e.type}, Visible: ${isVisible}`)

// 修改标志位
e.flags &= ~FLAGS.VISIBLE // Set visible false
const isVisibleNow = (e.flags & FLAGS.VISIBLE) !== 0
console.log(`修改后 Visible: ${isVisibleNow} (Raw Flag: ${e.flags})`)

console.log('\n--- 3. 运行物理循环 (性能瓶颈处) ---')
console.time('Physics Update')
// 同样的 10000 帧
for (let frame = 0; frame < 1; frame++) {
  system.updatePhysics(0.016)
}
console.timeEnd('Physics Update')
console.log(
  `ID 5 的新坐标: x=${system.entities[5].x.toFixed(2)}, y=${system.entities[5].y.toFixed(2)}`,
)

console.log('\n--- 4. Swap-and-Pop 删除测试 ---')
// 记录一下当前的 ID 顺序用于验证
console.log(
  `删除前 ID 序列: [0]=${system.entities[0].id} ... [Last]=${system.entities[system.entities.length - 1].id}`,
)

// 删除索引为 0 的元素
system.remove(0)

console.log(`删除后 ID 序列: [0]=${system.entities[0].id}`)
// 验证逻辑是否一致：原来的最后一个应该填到了 0 的位置
console.log(`当前数量: ${system.entities.length}`)

console.log('\n--- 5. 迭代器测试 ---')
let visibleCount = 0
for (const entity of system) {
  if ((entity.flags & FLAGS.VISIBLE) !== 0) {
    visibleCount++
  }
}
console.log(`可见实体数量: ${visibleCount}`)
