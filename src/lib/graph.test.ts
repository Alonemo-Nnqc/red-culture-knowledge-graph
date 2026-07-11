import { describe, expect, it } from 'vitest'
import { graphData } from '../data/graphData'
import { filterGraph, getRelatedNodeIds, getRouteStops, normalizeSearch, searchNodes } from './graph'

describe('图谱查询', () => {
  it('通过规范名检索周恩来', () => {
    expect(searchNodes(graphData.nodes, '周恩来')[0]?.name).toBe('周恩来')
  })

  it('通过别名检索周公馆', () => {
    expect(searchNodes(graphData.nodes, '周公馆')[0]?.name).toBe('中国共产党代表团驻沪办事处旧址')
  })

  it('筛选节点后不保留悬空关系', () => {
    const result = filterGraph(graphData, new Set(['place']), new Set(['route_to']), '')
    const visibleIds = new Set(result.nodes.map((node) => node.id))
    expect(result.relations.every((relation) => visibleIds.has(relation.source) && visibleIds.has(relation.target))).toBe(true)
  })

  it('按研学路线顺序返回三站', () => {
    expect(getRouteStops(graphData).map((node) => node.name)).toEqual([
      '中共一大纪念馆',
      '中国共产党代表团驻沪办事处旧址',
      '上海市龙华烈士陵园',
    ])
  })

  it('规范化搜索并返回一跳邻域', () => {
    expect(normalizeSearch('  周恩来  ')).toBe('周恩来')
    const related = getRelatedNodeIds(graphData, 'PER-016')
    expect(related.has('PER-016')).toBe(true)
    expect(related.has('EVT-006')).toBe(true)
    expect(related.has('ART-003')).toBe(true)
  })
})
