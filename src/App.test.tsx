import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const scrollIntoViewMock = vi.fn()

vi.mock('./components/GraphCanvas', () => ({
  default: ({ nodes, selectedNodeId }: { nodes: Array<{ id: string; name: string }>; selectedNodeId?: string }) => {
    const selected = nodes.find((node) => node.id === selectedNodeId)
    return (
      <div>
        <div role="img" aria-label="测试知识图谱画布" data-focused-node={selectedNodeId ?? ''} />
        {selected && <div role="status">已定位 · {selected.name}</div>}
      </div>
    )
  },
}))

describe('研学成果网页', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    scrollIntoViewMock.mockClear()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoViewMock })
  })

  it('展示节点关系统计和三种视图', () => {
    render(<App />)
    const stats = screen.getByLabelText('知识图谱统计')
    expect(within(stats).getByText('68')).toBeInTheDocument()
    expect(within(stats).getByText('96')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '知识图谱' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '研学路线' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '数据与来源' })).toBeInTheDocument()
  })

  it('检索人物并打开可追溯详情', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByRole('searchbox', { name: '搜索节点' }), '周恩来')
    await user.click(within(screen.getByRole('region', { name: '搜索结果' })).getByRole('button', { name: '查看周恩来' }))
    expect(screen.getByRole('dialog', { name: '周恩来详情' })).toBeInTheDocument()
    expect(screen.getByText('来源与证据')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '关闭详情' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('支持空结果、筛选、关联导航与重置', async () => {
    const user = userEvent.setup()
    render(<App />)
    const search = screen.getByRole('searchbox', { name: '搜索节点' })
    await user.type(search, '不存在的节点')
    expect(screen.getByText('没有找到匹配节点')).toBeInTheDocument()
    await user.clear(search)
    await user.click(screen.getByRole('button', { name: '筛选' }))
    await user.click(screen.getByRole('checkbox', { name: '人物' }))
    expect(screen.getByText('44')).toBeInTheDocument()
    expect(window.location.search).toContain('types=')
    await user.click(screen.getByRole('button', { name: '查看中共一大在上海开幕' }))
    const dialog = screen.getByRole('dialog', { name: '中共一大在上海开幕详情' })
    await user.click(within(dialog).getByRole('button', { name: /毛泽东/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: '人物' }))
    await user.click(screen.getByRole('button', { name: '查看中共一大在上海开幕' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /毛泽东/ }))
    expect(screen.getByRole('dialog', { name: '毛泽东详情' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重置' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('切换到路线后按顺序展示三站', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '研学路线' }))
    const stops = screen.getAllByTestId('route-stop')
    expect(stops[0]).toHaveTextContent('中共一大纪念馆')
    expect(stops[1]).toHaveTextContent('周公馆')
    expect(stops[2]).toHaveTextContent('龙华烈士陵园')
  })

  it('数据视图提供三表与JSON下载', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '数据与来源' }))
    expect(screen.getByRole('tab', { name: /^节点表/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^关系表/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^来源表/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /下载 graph.json/ })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^关系表/ }))
    expect(screen.getByRole('region', { name: /关系数据表/ })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^来源表/ }))
    expect(screen.getByRole('region', { name: /来源数据表/ })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: '搜索当前数据表' }), '国务院')
    expect(screen.getByText(/显示 1 条记录/)).toBeInTheDocument()
  })

  it('从研学路线返回图谱并逐站聚焦实际参观点', async () => {
    const user = userEvent.setup()
    render(<App />)
    const destinations = [
      { id: 'PLC-001', routeName: '中共一大纪念馆', canonicalName: '中共一大纪念馆' },
      { id: 'PLC-003', routeName: '周公馆', canonicalName: '中国共产党代表团驻沪办事处旧址' },
      { id: 'PLC-004', routeName: '龙华烈士陵园', canonicalName: '上海市龙华烈士陵园' },
    ]

    for (const destination of destinations) {
      scrollIntoViewMock.mockClear()
      await user.click(screen.getByRole('tab', { name: '研学路线' }))
      const routeCard = screen.getByRole('heading', { name: destination.routeName }).closest('[data-testid="route-stop"]')
      await user.click(within(routeCard as HTMLElement).getByRole('button', { name: '在图谱中查看' }))

      expect(screen.getByRole('tab', { name: '知识图谱' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('img', { name: '测试知识图谱画布' })).toHaveAttribute('data-focused-node', destination.id)
      expect(screen.getByRole('status')).toHaveTextContent(`已定位 · ${destination.canonicalName}`)
      expect(screen.getByRole('dialog', { name: `${destination.canonicalName}详情` })).toBeInTheDocument()
      expect(new URLSearchParams(window.location.search).get('node')).toBe(destination.id)
      expect(new URLSearchParams(window.location.search).has('view')).toBe(false)
      await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' }))
      expect(screen.getByRole('region', { name: '知识图谱探索器' })).toHaveFocus()
    }
  })
})
