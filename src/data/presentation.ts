import type { NodeType } from './types'

export type NodeShape = 'ellipse' | 'round-rectangle' | 'diamond' | 'hexagon' | 'rectangle' | 'star'

export const nodeTypePresentation: Record<NodeType, { color: string; shape: NodeShape }> = {
  person: { color: '#aa313b', shape: 'ellipse' },
  place: { color: '#9b6a1a', shape: 'round-rectangle' },
  event: { color: '#b5522f', shape: 'diamond' },
  time: { color: '#426b76', shape: 'hexagon' },
  artifact: { color: '#776047', shape: 'rectangle' },
  spirit: { color: '#7d4b83', shape: 'star' },
}
