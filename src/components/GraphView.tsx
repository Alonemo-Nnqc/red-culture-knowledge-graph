import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { graphData } from '../data/graphData'
import { nodeTypeLabels, nodeTypes, relationTypeLabels, relationTypes, type GraphNode, type NodeType, type RelationType } from '../data/types'
import { filterGraph, searchNodes } from '../lib/graph'
import DetailPanel from './DetailPanel'
import NodeMarker from './NodeMarker'

const GraphCanvas = lazy(() => import('./GraphCanvas'))

interface GraphViewProps {
  initialNodeId?: string
  onNodeChange: (nodeId?: string) => void
  enabledNodeTypes: Set<NodeType>
  onNodeTypesChange: (types: Set<NodeType>) => void
  enabledRelationTypes: Set<RelationType>
  onRelationTypesChange: (types: Set<RelationType>) => void
}

export default function GraphView({ initialNodeId, onNodeChange, enabledNodeTypes, onNodeTypesChange, enabledRelationTypes, onRelationTypesChange }: GraphViewProps) {
  const [query, setQuery] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(initialNodeId)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)

  const visible = useMemo(() => filterGraph(graphData, enabledNodeTypes, enabledRelationTypes, ''), [enabledNodeTypes, enabledRelationTypes])
  const results = useMemo(() => query ? searchNodes(visible.nodes, query).slice(0, 10) : [], [query, visible.nodes])
  const selectedNode = graphData.nodes.find((node) => node.id === selectedNodeId)

  useEffect(() => {
    if (initialNodeId && initialNodeId !== selectedNodeId) setSelectedNodeId(initialNodeId)
  }, [initialNodeId, selectedNodeId])

  useEffect(() => {
    if (selectedNodeId && !visible.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(undefined)
      onNodeChange(undefined)
    }
  }, [selectedNodeId, visible.nodes, onNodeChange])

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    onNodeChange(nodeId)
    setQuery('')
  }
  const closeDetail = () => {
    setSelectedNodeId(undefined)
    onNodeChange(undefined)
  }
  const reset = () => {
    setQuery('')
    onNodeTypesChange(new Set(nodeTypes))
    onRelationTypesChange(new Set(relationTypes))
    closeDetail()
    setResetSignal((value) => value + 1)
  }

  return (
    <section className="graph-view" aria-label="知识图谱探索器" tabIndex={-1}>
      <div className="toolbar-card">
        <div className="search-wrap">
          <Search size={19} aria-hidden="true" />
          <input type="search" aria-label="搜索节点" placeholder="搜索人物、地点、事件或别名…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && setQuery('')} />
          {query && (
            <div className="search-results" role="region" aria-label="搜索结果">
              {results.length ? results.map((node) => (
                <button key={node.id} type="button" aria-label={`查看${node.name}`} onClick={() => selectNode(node.id)}>
                  <NodeMarker type={node.type} />
                  <span><strong>{node.name}</strong><small>{nodeTypeLabels[node.type]} · {node.summary}</small></span>
                </button>
              )) : <p>没有找到匹配节点</p>}
            </div>
          )}
        </div>
        <div className="toolbar-actions">
          <button type="button" className={filtersOpen ? 'active' : ''} onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}><SlidersHorizontal size={18} /> 筛选</button>
          <button type="button" onClick={reset}><RotateCcw size={18} /> 重置</button>
        </div>
        {filtersOpen && (
          <div className="filter-panel">
            <fieldset><legend>节点类型</legend><div className="check-grid">{nodeTypes.map((type) => <FilterCheck key={type} label={nodeTypeLabels[type]} checked={enabledNodeTypes.has(type)} onChange={() => onNodeTypesChange(toggleSet(enabledNodeTypes, type))} className={`type-${type}`} />)}</div></fieldset>
            <fieldset><legend>关系类型</legend><div className="check-grid">{relationTypes.map((type) => <FilterCheck key={type} label={relationTypeLabels[type]} checked={enabledRelationTypes.has(type)} onChange={() => onRelationTypesChange(toggleSet(enabledRelationTypes, type))} />)}</div></fieldset>
          </div>
        )}
      </div>
      <div className={`graph-layout ${selectedNode ? 'has-detail' : ''}`}>
        <div>
          <div className="graph-status" aria-live="polite"><strong>{visible.nodes.length}</strong> 个可见节点 · <strong>{visible.relations.length}</strong> 条可见关系</div>
          <Suspense fallback={<div className="graph-frame graph-loading" role="status">正在加载知识图谱…</div>}>
            <GraphCanvas nodes={visible.nodes} relations={visible.relations} selectedNodeId={selectedNodeId} onSelectNode={selectNode} resetSignal={resetSignal} />
          </Suspense>
          <GraphLegend />
        </div>
        {selectedNode && <DetailPanel node={selectedNode} onClose={closeDetail} onSelectNode={selectNode} />}
      </div>
      <details className="accessible-directory">
        <summary><strong>节点文字目录</strong><span>{visible.nodes.length} 个节点</span></summary><p>作为图谱画布的键盘与读屏等价入口。</p>
        <div>{visible.nodes.map((node) => <button key={node.id} type="button" aria-label={`查看${node.name}`} onClick={() => selectNode(node.id)}>{node.name}</button>)}</div>
      </details>
    </section>
  )
}

function FilterCheck({ label, checked, onChange, className = '' }: { label: string; checked: boolean; onChange: () => void; className?: string }) {
  return <label className={className}><input type="checkbox" checked={checked} onChange={onChange} /><span>{label}</span></label>
}

function toggleSet<T>(values: Set<T>, value: T): Set<T> {
  const next = new Set(values)
  if (next.has(value)) next.delete(value); else next.add(value)
  return next
}

function GraphLegend() {
  return <div className="legend" aria-label="图谱图例"><span className="legend-title">图例</span>{nodeTypes.map((type) => <span key={type}><NodeMarker type={type} />{nodeTypeLabels[type]}</span>)}<span className="legend-divider" />{relationTypes.map((type) => <span key={type}><i className={`edge-marker relation-${type}`} />{relationTypeLabels[type]}</span>)}</div>
}
