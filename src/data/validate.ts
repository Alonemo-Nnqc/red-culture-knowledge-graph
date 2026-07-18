import { graphSchema } from './schema'
import { nodeTypes, relationTypes, type GraphData, type GraphNode, type GraphRelation } from './types'

const prefixes: Record<GraphNode['type'], string> = {
  person: 'PER', place: 'PLC', event: 'EVT', time: 'TIM', artifact: 'ART', spirit: 'SPI',
}

function hasCycle(relations: GraphRelation[], type: GraphRelation['type']): boolean {
  const edges = relations.filter((relation) => relation.type === type)
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return [...adjacency.keys()].some(visit)
}

function hasAuthoritativeCitation(graph: GraphData, recordKind: GraphNode['recordKind'], sourceIds: string[]): boolean {
  return sourceIds.some((sourceId) => {
    const source = graph.sources.find((item) => item.id === sourceId)
    if (!source) return false
    return ['S', 'A'].includes(source.authorityTier) || (recordKind === 'itinerary' && source.sourceType === 'activity_record')
  })
}

export function validateGraph(input: unknown): string[] {
  const parsed = graphSchema.safeParse(input)
  if (!parsed.success) return parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)

  const graph = parsed.data as GraphData
  const errors: string[] = []
  if (graph.nodes.length < 68) errors.push('节点少于68个')
  if (graph.relations.length < 96) errors.push('关系少于96条')

  const nodeIds = new Set<string>()
  const sourceIds = new Set<string>()
  const relationIds = new Set<string>()
  for (const source of graph.sources) {
    if (sourceIds.has(source.id)) errors.push(`重复来源 ID：${source.id}`)
    sourceIds.add(source.id)
  }
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push(`重复节点 ID：${node.id}`)
    nodeIds.add(node.id)
    if (!node.id.startsWith(prefixes[node.type])) errors.push(`节点前缀错误：${node.id}`)
    for (const citation of node.citations) if (!sourceIds.has(citation.sourceId)) errors.push(`节点 ${node.id} 引用了不存在的来源 ${citation.sourceId}`)
    if (node.isCore && !hasAuthoritativeCitation(graph, node.recordKind, node.citations.map((citation) => citation.sourceId))) {
      errors.push(`核心节点 ${node.id} 缺少 S/A 级来源`)
    }
  }

  const uniqueEdges = new Set<string>()
  for (const relation of graph.relations) {
    if (relationIds.has(relation.id)) errors.push(`重复关系 ID：${relation.id}`)
    relationIds.add(relation.id)
    if (!nodeIds.has(relation.source) || !nodeIds.has(relation.target)) errors.push(`关系 ${relation.id} 存在悬空端点`)
    if (relation.source === relation.target) errors.push(`关系 ${relation.id} 是自环`)
    const edgeKey = `${relation.source}|${relation.type}|${relation.target}|${relation.sequenceScope ?? ''}`
    if (uniqueEdges.has(edgeKey)) errors.push(`重复关系：${edgeKey}`)
    uniqueEdges.add(edgeKey)
    for (const citation of relation.citations) if (!sourceIds.has(citation.sourceId)) errors.push(`关系 ${relation.id} 引用了不存在的来源 ${citation.sourceId}`)
    if (relation.isCore && !hasAuthoritativeCitation(graph, relation.recordKind, relation.citations.map((citation) => citation.sourceId))) {
      errors.push(`核心关系 ${relation.id} 缺少 S/A 级来源`)
    }
  }

  const citedSourceIds = new Set([
    ...graph.nodes.flatMap((node) => node.citations.map((citation) => citation.sourceId)),
    ...graph.relations.flatMap((relation) => relation.citations.map((citation) => citation.sourceId)),
  ])
  for (const source of graph.sources) if (!citedSourceIds.has(source.id)) errors.push(`来源 ${source.id} 未被任何节点或关系引用`)

  for (const type of nodeTypes) if (!graph.nodes.some((node) => node.type === type)) errors.push(`缺少 ${type} 节点`)
  for (const type of relationTypes) if (!graph.relations.some((relation) => relation.type === type)) errors.push(`缺少 ${type} 关系`)

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  for (const relation of graph.relations) {
    const source = nodeById.get(relation.source)
    const target = nodeById.get(relation.target)
    if (!source || !target) continue
    if (relation.type === 'occurred_at' && !(source.type === 'event' && ['place', 'time'].includes(target.type))) errors.push(`${relation.id} 的发生于方向或类型错误`)
    if (relation.type === 'associated_person' && !(['event', 'place', 'artifact'].includes(source.type) && target.type === 'person')) errors.push(`${relation.id} 的关联人物方向或类型错误`)
    if (relation.type === 'embodies_spirit' && !(['person', 'event', 'place', 'artifact'].includes(source.type) && target.type === 'spirit')) errors.push(`${relation.id} 的体现精神方向或类型错误`)
    if (relation.type === 'precedes' && !(source.type === 'event' && target.type === 'event')) errors.push(`${relation.id} 的时间顺序方向或类型错误`)
    if (relation.type === 'route_to' && !(source.type === 'place' && target.type === 'place')) errors.push(`${relation.id} 的路线连接方向或类型错误`)
  }

  if (hasCycle(graph.relations, 'precedes')) errors.push('时间顺序存在环')
  if (hasCycle(graph.relations, 'route_to')) errors.push('研学路线存在环')

  const route = graph.nodes.filter((node) => node.routeStopOrder).sort((a, b) => (a.routeStopOrder ?? 0) - (b.routeStopOrder ?? 0))
  const expected = ['中共一大纪念馆', '中国共产党代表团驻沪办事处旧址', '上海市龙华烈士陵园']
  if (route.map((node) => node.name).join('|') !== expected.join('|')) errors.push('三站研学路线顺序不正确')
  const routeRelations = graph.relations.filter((relation) => relation.type === 'route_to').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (routeRelations.length !== 2 || routeRelations[0]?.source !== route[0]?.id || routeRelations[0]?.target !== route[1]?.id || routeRelations[1]?.source !== route[1]?.id || routeRelations[1]?.target !== route[2]?.id) {
    errors.push('路线连接未形成严格的三站顺序')
  }
  return errors
}
