import { describe, expect, it } from 'vitest'
import { nodeTypePresentation } from './presentation'

describe('节点视觉语义', () => {
  it('为六类节点提供唯一且可复用的图形', () => {
    expect(Object.fromEntries(Object.entries(nodeTypePresentation).map(([type, presentation]) => [type, presentation.shape]))).toEqual({
      person: 'ellipse',
      place: 'round-rectangle',
      event: 'diamond',
      time: 'hexagon',
      artifact: 'rectangle',
      spirit: 'star',
    })
  })
})
