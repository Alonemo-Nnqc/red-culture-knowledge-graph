import { describe, expect, it } from 'vitest'
import { graphData } from './graphData'
import { validateGraph } from './validate'
import { nodeSchema } from './schema'

describe('知识图谱数据合同', () => {
  it('包含准确的68个节点和96条关系', () => {
    expect(graphData.nodes).toHaveLength(68)
    expect(graphData.relations).toHaveLength(96)
  })

  it('通过全部语义和引用校验', () => {
    expect(validateGraph(graphData)).toEqual([])
  })

  it('覆盖六类节点及五类关系', () => {
    expect(new Set(graphData.nodes.map((node) => node.type))).toEqual(
      new Set(['person', 'place', 'event', 'time', 'artifact', 'spirit']),
    )
    expect(new Set(graphData.relations.map((relation) => relation.type))).toEqual(
      new Set(['occurred_at', 'associated_person', 'embodies_spirit', 'precedes', 'route_to']),
    )
  })

  it('拒绝错误节点前缀、文物性质、日期和坐标', () => {
    const base = graphData.nodes.find((node) => node.type === 'artifact')!
    const invalid = nodeSchema.safeParse({
      ...base,
      id: 'PER-999',
      attributes: { ...base.attributes, authenticity: 'unknown', startDate: '1921/07/23', longitude: 181, latitude: 91 },
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) expect(invalid.error.issues.length).toBeGreaterThanOrEqual(4)
  })

  it('为结构损坏的数据返回可读错误', () => {
    expect(validateGraph({ nodes: [] })).toContain('relations: Invalid input: expected array, received undefined')
  })

  it('每个事件都有可讲解的背景、经过、影响和史料说明', () => {
    const events = graphData.nodes.filter((node) => node.type === 'event')
    expect(events).toHaveLength(14)
    for (const event of events) {
      expect(event.narrative?.background.length, `${event.id} 缺少背景`).toBeGreaterThanOrEqual(30)
      expect(event.narrative?.process.length, `${event.id} 缺少详细经过`).toBeGreaterThanOrEqual(60)
      expect(event.narrative?.significance.length, `${event.id} 缺少影响`).toBeGreaterThanOrEqual(30)
      expect(event.narrative?.sourceNote.length, `${event.id} 缺少史料口径`).toBeGreaterThanOrEqual(15)
      const total = Object.values(event.narrative ?? {}).join('').length
      expect(total, `${event.id} 叙事过短`).toBeGreaterThanOrEqual(event.id === 'EVT-014' ? 150 : 220)
    }
  })
})
