import { nodeTypePresentation } from '../data/presentation'
import type { NodeType } from '../data/types'

export default function NodeMarker({ type }: { type: NodeType }) {
  const presentation = nodeTypePresentation[type]
  return (
    <i
      className="node-marker"
      data-node-type={type}
      data-node-shape={presentation.shape}
      style={{ '--node-color': presentation.color } as React.CSSProperties}
      aria-hidden="true"
    />
  )
}
