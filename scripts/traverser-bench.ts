import { performance } from 'node:perf_hooks'
import { createTraverser } from '../src/editor/utils/traverser.ts'

type BenchNode = {
  id: number
  children?: BenchNode[]
  childIds?: number[]
}

type BenchContext = {
  nodeMap: Record<number, BenchNode>
  visitCount: number
}

type BuildResult = {
  root: BenchNode
  nodeMap: Record<number, BenchNode>
  totalNodes: number
}

function buildTree(maxDepth: number, branchSize: number): BuildResult {
  let id = 0
  const nodeMap: Record<number, BenchNode> = {}

  const makeNode = (depth: number): BenchNode => {
    const node: BenchNode = { id: id++ }
    nodeMap[node.id] = node

    if (depth >= maxDepth) {
      return node
    }

    const children: BenchNode[] = []
    const childIds: number[] = []
    for (let i = 0; i < branchSize; i++) {
      const child = makeNode(depth + 1)
      children.push(child)
      childIds.push(child.id)
    }

    node.children = children
    node.childIds = childIds
    return node
  }

  const root = makeNode(0)
  return { root, nodeMap, totalNodes: id }
}

function runCase(name: string, rounds: number, fn: () => void) {
  const warmupRounds = 5
  for (let i = 0; i < warmupRounds; i++) fn()

  const samples: number[] = []
  for (let i = 0; i < rounds; i++) {
    const t1 = performance.now()
    fn()
    const t2 = performance.now()
    samples.push(t2 - t1)
  }

  const total = samples.reduce((sum, n) => sum + n, 0)
  const avg = total / samples.length
  const min = Math.min(...samples)
  const max = Math.max(...samples)

  console.log(
    `${name.padEnd(16)} avg=${avg.toFixed(3)}ms min=${min.toFixed(
      3,
    )}ms max=${max.toFixed(3)}ms`,
  )
}

function main() {
  const depth = 9
  const branchSize = 4
  const rounds = 30

  const { root, nodeMap, totalNodes } = buildTree(depth, branchSize)
  let checksum = 0

  const traverser = createTraverser<BenchNode, BenchContext>({
    enter(node, ctx) {
      checksum += node.id
      ctx.visitCount++
    },
  })

  console.log('--- traverser benchmark ---')
  console.log(`depth=${depth}, branchSize=${branchSize}, rounds=${rounds}`)
  console.log(`totalNodes=${totalNodes}`)
  console.log('')

  runCase('run(children)', rounds, () => {
    traverser.walk(root, { nodeMap, visitCount: 0 })
  })

  console.log('')
  console.log(`checksum=${checksum}`)
}

main()
