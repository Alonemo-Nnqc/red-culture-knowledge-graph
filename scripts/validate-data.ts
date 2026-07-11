import { graphData } from '../src/data/graphData'
import { validateGraph } from '../src/data/validate'

const errors = validateGraph(graphData)
if (errors.length) {
  console.error(`数据校验失败（${errors.length}项）：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

const counts = Object.fromEntries([...new Set(graphData.nodes.map((node) => node.type))].map((type) => [type, graphData.nodes.filter((node) => node.type === type).length]))
console.log(`数据校验通过：${graphData.nodes.length} 个节点、${graphData.relations.length} 条关系、${graphData.sources.length} 个来源。`)
console.log(counts)
