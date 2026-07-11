import { Download, ExternalLink, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { graphData } from '../data/graphData'
import { nodeTypeLabels, relationTypeLabels } from '../data/types'

type TableName = 'nodes' | 'relations' | 'sources'

export default function DataView() {
  const [table, setTable] = useState<TableName>('nodes')
  const [query, setQuery] = useState('')
  const [sortAscending, setSortAscending] = useState(true)
  const rows = useMemo(() => {
    const values = table === 'nodes' ? graphData.nodes : table === 'relations' ? graphData.relations : graphData.sources
    const normalized = query.trim().toLocaleLowerCase('zh-CN')
    const filtered = normalized ? values.filter((row) => JSON.stringify(row).toLocaleLowerCase('zh-CN').includes(normalized)) : values
    return [...filtered].sort((left, right) => {
      const leftId = 'id' in left ? String(left.id) : ''
      const rightId = 'id' in right ? String(right.id) : ''
      return (sortAscending ? 1 : -1) * leftId.localeCompare(rightId)
    })
  }, [table, query, sortAscending])

  return (
    <section className="data-view" aria-labelledby="data-title">
      <div className="section-heading"><span className="eyebrow">OPEN DATA · TRACEABLE FACTS</span><h2 id="data-title">结构化数据与史料来源</h2><p>网页、CSV 与 JSON 由同一份事实源生成，避免多份数据彼此漂移。</p></div>
      <div className="download-bar">
        <Download size={22} /><div><strong>开放数据包</strong><span>UTF-8 CSV + JSON · 共{graphData.nodes.length}节点 / {graphData.relations.length}关系 / {graphData.sources.length}来源</span></div>
        <a href="./data/graph.json" download>下载 graph.json</a><a href="./data/nodes.csv" download>节点 CSV</a><a href="./data/relations.csv" download>关系 CSV</a><a href="./data/sources.csv" download>来源 CSV</a>
      </div>
      <div className="data-card">
        <div className="data-controls">
          <div role="tablist" aria-label="数据表选择">
            <button role="tab" aria-selected={table === 'nodes'} onClick={() => setTable('nodes')}>节点表 <span>{graphData.nodes.length}</span></button>
            <button role="tab" aria-selected={table === 'relations'} onClick={() => setTable('relations')}>关系表 <span>{graphData.relations.length}</span></button>
            <button role="tab" aria-selected={table === 'sources'} onClick={() => setTable('sources')}>来源表 <span>{graphData.sources.length}</span></button>
          </div>
          <div className="table-actions"><button type="button" className="sort-button" onClick={() => setSortAscending((value) => !value)} aria-label={`按ID${sortAscending ? '降序' : '升序'}排列`}>ID {sortAscending ? '↑' : '↓'}</button><label><Search size={17} /><span className="sr-only">搜索当前数据表</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前表…" /></label></div>
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={`${table === 'nodes' ? '节点' : table === 'relations' ? '关系' : '来源'}数据表，可横向和纵向滚动`}>{table === 'nodes' ? <NodesTable rows={rows as typeof graphData.nodes} /> : table === 'relations' ? <RelationsTable rows={rows as typeof graphData.relations} /> : <SourcesTable rows={rows as typeof graphData.sources} />}</div>
        <p className="table-count" aria-live="polite">显示 {rows.length} 条记录</p>
      </div>
    </section>
  )
}

function NodesTable({ rows }: { rows: typeof graphData.nodes }) {
  return <table><thead><tr><th>ID</th><th>名称</th><th>类型</th><th>范围</th><th>摘要</th><th>核心</th><th>来源</th></tr></thead><tbody>{rows.map((node) => <tr key={node.id}><td><code>{node.id}</code></td><td><strong>{node.name}</strong>{node.aliases.length > 0 && <small>{node.aliases.join('、')}</small>}</td><td><span className={`type-pill type-${node.type}`}>{nodeTypeLabels[node.type]}</span></td><td>{scopeLabel(node.siteScope)}</td><td>{node.summary}</td><td>{node.isCore ? '是' : '—'}</td><td>{node.citations.length}</td></tr>)}</tbody></table>
}

function RelationsTable({ rows }: { rows: typeof graphData.relations }) {
  const names = new Map(graphData.nodes.map((node) => [node.id, node.name]))
  return <table><thead><tr><th>ID</th><th>源节点</th><th>关系</th><th>目标节点</th><th>断言</th><th>来源</th></tr></thead><tbody>{rows.map((relation) => <tr key={relation.id}><td><code>{relation.id}</code></td><td>{names.get(relation.source)}</td><td><span className="relation-pill">{relationTypeLabels[relation.type]}</span></td><td>{names.get(relation.target)}</td><td>{relation.claim}</td><td>{relation.citations.length}</td></tr>)}</tbody></table>
}

function SourcesTable({ rows }: { rows: typeof graphData.sources }) {
  return <table><thead><tr><th>ID</th><th>来源题名</th><th>发布机构</th><th>等级</th><th>类型</th><th>访问日期</th><th>链接</th></tr></thead><tbody>{rows.map((source) => <tr key={source.id}><td><code>{source.id}</code></td><td><strong>{source.title}</strong><small>{source.notes}</small></td><td>{source.publisher}</td><td><span className="authority-tier">{source.authorityTier}</span></td><td>{source.sourceType}</td><td>{source.accessedAt}</td><td>{source.canonicalUrl ? <a href={source.canonicalUrl} target="_blank" rel="noopener noreferrer" aria-label={`打开${source.title}`}><ExternalLink size={17} /></a> : '—'}</td></tr>)}</tbody></table>
}

function scopeLabel(scope: string) { return ({ yida: '一大', zhougongguan: '周公馆', longhua: '龙华', cross_site: '跨点位' } as Record<string, string>)[scope] ?? scope }
