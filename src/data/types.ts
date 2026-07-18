export const nodeTypes = ['person', 'place', 'event', 'time', 'artifact', 'spirit'] as const
export const relationTypes = ['occurred_at', 'associated_person', 'embodies_spirit', 'precedes', 'route_to'] as const
export const siteScopes = ['yida', 'zhougongguan', 'longhua', 'cross_site'] as const
export const recordKinds = ['historical_fact', 'interpretation', 'itinerary'] as const

export type NodeType = (typeof nodeTypes)[number]
export type RelationType = (typeof relationTypes)[number]
export type SiteScope = (typeof siteScopes)[number]
export type RecordKind = (typeof recordKinds)[number]

export interface Citation {
  sourceId: string
  locator: string
  evidenceExcerpt: string
}

export interface EventNarrative {
  background: string
  process: string
  significance: string
  sourceNote: string
}

export interface GraphNode {
  id: string
  type: NodeType
  name: string
  aliases: string[]
  siteScope: SiteScope
  summary: string
  description: string
  isCore: boolean
  recordKind: RecordKind
  routeStopOrder?: number
  attributes: Record<string, string | number | boolean | null>
  citations: Citation[]
  layout: { x: number; y: number }
  narrative?: EventNarrative
}

export interface GraphRelation {
  id: string
  source: string
  target: string
  type: RelationType
  label: string
  claim: string
  sequenceScope?: SiteScope
  order?: number
  isCore: boolean
  recordKind: RecordKind
  citations: Citation[]
}

export interface Source {
  id: string
  title: string
  publisher: string
  hostPublisher?: string
  sourceType: 'official_museum' | 'party_history' | 'government' | 'archive' | 'academic' | 'publication' | 'onsite_label' | 'activity_record'
  authorityTier: 'S' | 'A' | 'B' | 'C'
  author?: string
  photoCredit?: string
  publicationDate?: string
  canonicalUrl?: string
  identifier?: string
  accessedAt: string
  rights: string
  notes: string
}

export interface GraphData {
  nodes: GraphNode[]
  relations: GraphRelation[]
  sources: Source[]
}

export const nodeTypeLabels: Record<NodeType, string> = {
  person: '人物',
  place: '地点',
  event: '事件',
  time: '时间',
  artifact: '文物',
  spirit: '精神内涵',
}

export const relationTypeLabels: Record<RelationType, string> = {
  occurred_at: '发生于',
  associated_person: '关联人物',
  embodies_spirit: '体现精神',
  precedes: '时间顺序',
  route_to: '路线连接',
}
