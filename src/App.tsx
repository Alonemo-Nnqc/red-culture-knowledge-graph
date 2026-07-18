import { Database, Landmark, Map, Network, Route, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import DataView from './components/DataView'
import GraphView from './components/GraphView'
import RouteView from './components/RouteView'
import { graphData } from './data/graphData'
import { nodeTypes, relationTypes, type NodeType, type RelationType } from './data/types'

type View = 'graph' | 'route' | 'data'

function parseEnumSet<T extends string>(value: string | null, allowed: readonly T[]): Set<T> {
  if (!value) return new Set(allowed)
  const parsed = value.split(',').filter((item): item is T => allowed.includes(item as T))
  return parsed.length ? new Set(parsed) : new Set(allowed)
}

function readInitialState(): { view: View; node?: string; nodeTypeSet: Set<NodeType>; relationTypeSet: Set<RelationType> } {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  return {
    view: view === 'route' || view === 'data' ? view : 'graph',
    node: params.get('node') ?? undefined,
    nodeTypeSet: parseEnumSet(params.get('types'), nodeTypes),
    relationTypeSet: parseEnumSet(params.get('relations'), relationTypes),
  }
}

export default function App() {
  const initial = useMemo(readInitialState, [])
  const [view, setView] = useState<View>(initial.view)
  const [nodeId, setNodeId] = useState<string | undefined>(initial.node)
  const [enabledNodeTypes, setEnabledNodeTypes] = useState<Set<NodeType>>(initial.nodeTypeSet)
  const [enabledRelationTypes, setEnabledRelationTypes] = useState<Set<RelationType>>(initial.relationTypeSet)

  useEffect(() => {
    const params = new URLSearchParams()
    if (view !== 'graph') params.set('view', view)
    if (nodeId && view === 'graph') params.set('node', nodeId)
    if (enabledNodeTypes.size !== nodeTypes.length) params.set('types', nodeTypes.filter((type) => enabledNodeTypes.has(type)).join(','))
    if (enabledRelationTypes.size !== relationTypes.length) params.set('relations', relationTypes.filter((type) => enabledRelationTypes.has(type)).join(','))
    const next = params.size ? `?${params}` : window.location.pathname
    window.history.replaceState(null, '', next)
  }, [view, nodeId, enabledNodeTypes, enabledRelationTypes])

  const switchView = (next: View) => {
    setView(next)
    if (next !== 'graph') setNodeId(undefined)
  }
  const openGraph = (id: string) => {
    const target = graphData.nodes.find((node) => node.id === id)
    if (target && !enabledNodeTypes.has(target.type)) {
      setEnabledNodeTypes((current) => new Set([...current, target.type]))
    }
    setNodeId(id)
    setView('graph')
    window.setTimeout(() => {
      const graphView = document.querySelector<HTMLElement>('.graph-view')
      graphView?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      graphView?.focus({ preventScroll: true })
    }, 80)
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-inner">
          <div className="topbar">
            <div className="project-brand">
              <span className="brand-symbol" aria-hidden="true"><Landmark size={18} /></span>
              <span><strong>“初心启智，数创未来”实践队</strong><small>计算机与大数据学院</small></span>
            </div>
            <div className="data-quality"><ShieldCheck size={16} aria-hidden="true" />权威史料 · 事实级溯源</div>
          </div>
          <div className="hero-grid">
            <div className="hero-intro"><p className="hero-theme">从一大初心到智能未来</p><h1>上海红色文化知识图谱</h1><p className="hero-copy">以数据连接人物、地点与精神，让红色记忆成为可检索、可连接、可讲解的数字资源。</p></div>
            <div className="hero-stats" aria-label="知识图谱统计">
              <Stat value={graphData.nodes.length} label="知识节点" icon={<Network />} />
              <Stat value={graphData.relations.length} label="语义关系" icon={<Route />} />
              <Stat value={graphData.sources.length} label="权威来源" icon={<ShieldCheck />} />
            </div>
          </div>
          <nav className="view-tabs" role="tablist" aria-label="页面视图">
            <button role="tab" aria-selected={view === 'graph'} onClick={() => switchView('graph')}><Network size={19} />知识图谱</button>
            <button role="tab" aria-selected={view === 'route'} onClick={() => switchView('route')}><Map size={19} />研学路线</button>
            <button role="tab" aria-selected={view === 'data'} onClick={() => switchView('data')}><Database size={19} />数据与来源</button>
          </nav>
        </div>
      </header>
      <main>
        {view === 'graph' && <GraphView initialNodeId={nodeId} onNodeChange={setNodeId} enabledNodeTypes={enabledNodeTypes} onNodeTypesChange={setEnabledNodeTypes} enabledRelationTypes={enabledRelationTypes} onRelationTypesChange={setEnabledRelationTypes} />}
        {view === 'route' && <RouteView onOpenGraph={openGraph} />}
        {view === 'data' && <DataView />}
      </main>
      <footer><div><strong>上海红色文化知识图谱</strong><span>计算机与大数据专业服务红色文化传播</span></div><p>史实数据核验至 2026-07-18 · 核心内容均标注来源</p></footer>
    </div>
  )
}

function Stat({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return <div className="stat-card"><span aria-hidden="true">{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>
}
