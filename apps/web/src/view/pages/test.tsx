import { recordTime } from 'src/utils/misc'

export const Test = () => {
  useEffect(() => {}, [])
  return (
    <div>
      <TimeRecordComp />
    </div>
  )
}

const Comp2: FC<{}> = observer(({}) => {
  useEffect(() => {
    return () => {
      console.log('Comp2 unmounted')
    }
  }, [])
  return <G></G>
})

const TimeRecordComp: FC<{}> = observer(({}) => {
  useEffect(() => {
    recordTime(
      'test',
      (logTime, range) => {
        range(1, () => {
          test1()
        })
        logTime('createRegularPolygon')
      },
      10,
    )
    recordTime(
      'test2',
      (logTime, range) => {
        range(1, () => {
          test1_dynamic()
        })
        logTime('createRegularPolygon2')
      },
      10,
    )
    recordTime(
      'test3',
      (logTime, range) => {
        range(1, () => {
          test1_structured()
        })
        logTime('createRegularPolygon3')
      },
      10,
    )
  }, [])
  return <G></G>
})

function test1() {
  // 1. 使用 TypedArray 模拟 Struct Array (SoA - Structure of Arrays 布局往往比 AoS 更快)
  const COUNT = 1000000
  const xCoords = new Float64Array(COUNT)
  const yCoords = new Float64Array(COUNT)
  const xVels = new Float64Array(COUNT)
  const yVels = new Float64Array(COUNT)

  // 2. 初始化数据 (避免 NaN)
  for (let i = 0; i < COUNT; i = (i + 1) | 0) {
    // 使用位运算确保 i 是整数
    xCoords[i] = Math.random()
    yCoords[i] = Math.random()
    xVels[i] = 0.01
    yVels[i] = 0.01
  }

  // 3. 核心循环：无对象创建，类型单一，内存连续访问
  function update() {
    // 缓存长度，虽然现代 V8 能优化，但这是 C 程序员的习惯
    const len = COUNT | 0

    for (let i = 0; i < len; i = (i + 1) | 0) {
      // 直接读写内存，无 GC，无 Hidden Class 查找
      xCoords[i] = xCoords[i] + xVels[i]
      yCoords[i] = yCoords[i] + yVels[i]
    }
  }

  update()
}

function test1_dynamic() {
  const COUNT = 1_000_000

  // 1. 使用对象数组（AoS）
  const points: any[] = []

  for (let i = 0; i < COUNT; i++) {
    const obj = {}
    obj.x = Math.random()
    obj.y = Math.random()
    obj.vx = 0.01
    obj.vy = 0.01
    points.push(obj)
  }

  // 2. 核心逻辑：对象 + 属性访问
  function update() {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      p.x += p.vx
      p.y += p.vy
    }
  }

  update()
}

function test1_structured() {
  const COUNT = 1_000_000

  // 1. 使用对象数组（AoS）
  const points: any[] = []

  class Point {
    constructor(
      public x: number,
      public y: number,
      public vx: number,
      public vy: number,
    ) {}
  }

  for (let i = 0; i < COUNT; i++) {
    points.push(new Point(Math.random(), Math.random(), 0.01, 0.01))
  }

  // 2. 核心逻辑：对象 + 属性访问
  function update() {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      p.x += p.vx
      p.y += p.vy
    }
  }

  update()
}
