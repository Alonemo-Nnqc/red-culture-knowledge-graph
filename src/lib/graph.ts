import type { GraphData, GraphNode, NodeType, RelationType } from '../data/types'

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN')
}

export function searchNodes(nodes: GraphNode[], query: string): GraphNode[] {
  const normalized = normalizeSearch(query)
  if (!normalized) return nodes
  return nodes
    .map((node) => {
      const name = normalizeSearch(node.name)
      const aliases = node.aliases.map(normalizeSearch)
      const text = normalizeSearch(`${node.summary} ${node.description}`)
      const score = name === normalized ? 0 : aliases.some((alias) => alias === normalized) ? 1 : name.includes(normalized) ? 2 : aliases.some((alias) => alias.includes(normalized)) ? 3 : text.includes(normalized) ? 4 : 99
      return { node, score }
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || a.node.name.localeCompare(b.node.name, 'zh-CN'))
    .map(({ node }) => node)
}

export function filterGraph(graph: GraphData, enabledNodeTypes: Set<NodeType>, enabledRelationTypes: Set<RelationType>, query: string): GraphData {
  const matchedIds = new Set(searchNodes(graph.nodes, query).map((node) => node.id))
  const nodes = graph.nodes.filter((node) => enabledNodeTypes.has(node.type) && (!normalizeSearch(query) || matchedIds.has(node.id)))
  const visibleIds = new Set(nodes.map((node) => node.id))
  const relations = graph.relations.filter((relation) => enabledRelationTypes.has(relation.type) && visibleIds.has(relation.source) && visibleIds.has(relation.target))
  return { ...graph, nodes, relations }
}

export function getRouteStops(graph: GraphData): GraphNode[] {
  return graph.nodes.filter((node) => node.routeStopOrder !== undefined).sort((a, b) => (a.routeStopOrder ?? 0) - (b.routeStopOrder ?? 0))
}

export function getRelatedNodeIds(graph: GraphData, nodeId: string): Set<string> {
  const ids = new Set([nodeId])
  for (const relation of graph.relations) {
    if (relation.source === nodeId) ids.add(relation.target)
    if (relation.target === nodeId) ids.add(relation.source)
  }
  return ids
}
