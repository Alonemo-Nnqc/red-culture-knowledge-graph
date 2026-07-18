import { describe, expect, it } from 'vitest'
import { graphData } from './graphData'
import { validateGraph } from './validate'
import { nodeSchema } from './schema'
import { nodeTypeLabels } from './types'

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

  it('将 spirit 节点统一表述为精神内涵', () => {
    expect(nodeTypeLabels.spirit).toBe('精神内涵')
  })

  it('每个非事件节点都有可讲解的扩展介绍', () => {
    for (const node of graphData.nodes.filter((item) => item.type !== 'event')) {
      expect(node.description.length, `${node.id} 的介绍过短`).toBeGreaterThanOrEqual(60)
    }
  })

  it('外部来源均使用权威站点且没有已知失效地址', () => {
    const officialHosts = new Set([
      'www.zgyd1921.com',
      'www.dswxyjy.org.cn',
      'tyjr.sh.gov.cn',
      'www.chinamartyrs.gov.cn',
      'www.gov.cn',
      'www.shtong.gov.cn',
      'www.ccphistory.org.cn',
      'www.12371.cn',
      'news.12371.cn',
      'www.shanghai.gov.cn',
    ])
    for (const source of graphData.sources.filter((item) => item.sourceType !== 'activity_record')) {
      expect(source.canonicalUrl, `${source.id} 缺少原始链接`).toBeTruthy()
      const url = new URL(source.canonicalUrl!)
      expect(officialHosts.has(url.hostname), `${source.id} 不是核验过的权威站点`).toBe(true)
      expect(url.hostname, `${source.id} 使用了已知失效站点`).not.toBe('www.shlhlsly.com')
    }
  })

  it('保留一大闭幕日期和南湖具体参会人员的史料边界', () => {
    const southLake = graphData.nodes.find((node) => node.id === 'EVT-003')!
    const disputedTime = graphData.nodes.find((node) => node.id === 'TIM-003')!
    expect(southLake.attributes.certainty).toBe('闭幕日期有7月31日、8月1日、8月2日、8月5日四种主要观点，尚无定论')
    expect(disputedTime.attributes.certainty).toBe(southLake.attributes.certainty)
    expect(graphData.relations.some((relation) => relation.source === 'EVT-003' && relation.type === 'associated_person')).toBe(false)
  })

  it('区分周公馆旧址、历史门牌与当前参观地址', () => {
    const zhougongguan = graphData.nodes.find((node) => node.id === 'PLC-003')!
    expect(zhougongguan.attributes.modernAddress).toBe('上海市黄浦区思南路73号')
    expect(zhougongguan.attributes.historicalAddress).toBe('上海市思南路107号')
    expect(zhougongguan.attributes.visitorAddress).toBe('上海市黄浦区思南路71、73号')
  })

  it('为馆藏译本使用精确页面并正确处理不适用的真实性字段', () => {
    const manifesto = graphData.nodes.find((node) => node.id === 'ART-001')!
    expect(manifesto.citations[0]?.sourceId).toBe('SRC-033')
    expect(graphData.sources.find((source) => source.id === 'SRC-033')?.canonicalUrl).toBe('https://www.zgyd1921.com/collection/highlights.html')
    expect(graphData.nodes.find((node) => node.id === 'ART-005')?.attributes.authenticity).toBe('not_applicable')
    expect(graphData.nodes.find((node) => node.id === 'ART-006')?.attributes.authenticity).toBe('not_applicable')
  })

  it('内部行程记录只对研学路线具有一手证据效力', () => {
    const itinerary = graphData.sources.find((source) => source.id === 'SRC-010')!
    expect(itinerary.authorityTier).toBe('C')
    expect(itinerary.identifier).toBe('RC-STUDY-ROUTE-2026-v1')
    expect(itinerary.notes).toContain('primary_for_itinerary')
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
