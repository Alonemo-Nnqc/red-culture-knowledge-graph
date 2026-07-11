import cytoscape, { type Core } from 'cytoscape'
import { Minus, Plus, Scan } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GraphNode, GraphRelation, NodeType, RelationType } from '../data/types'
import { classifyWheelGesture, nextTrackpadZoom, normalizeWheelDelta } from '../lib/graphGestures'

const nodeColors: Record<NodeType, string> = {
  person: '#aa313b', place: '#9b6a1a', event: '#b5522f', time: '#426b76', artifact: '#776047', spirit: '#7d4b83',
}

const nodeShapes: Record<NodeType, cytoscape.Css.NodeShape> = {
  person: 'ellipse', place: 'round-rectangle', event: 'diamond', time: 'hexagon', artifact: 'rectangle', spirit: 'star',
}

const edgeColors: Record<RelationType, string> = {
  occurred_at: '#9c7652', associated_person: '#b6534f', embodies_spirit: '#7d4b83', precedes: '#47717b', route_to: '#c7932f',
}

interface GraphCanvasProps {
  nodes: GraphNode[]
  relations: GraphRelation[]
  selectedNodeId?: string
  onSelectNode: (nodeId: string) => void
  resetSignal: number
}

export default function GraphCanvas({ nodes, relations, selectedNodeId, onSelectNode, resetSignal }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<Core | null>(null)
  const selectRef = useRef(onSelectNode)
  const didMountResetRef = useRef(false)
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1 })
  selectRef.current = onSelectNode

  useEffect(() => {
    if (!containerRef.current) return
    const core = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((node) => ({ data: { id: node.id, label: node.name, nodeType: node.type }, position: node.layout })),
        ...relations.map((relation) => ({ data: { id: relation.id, source: relation.source, target: relation.target, label: relation.label, relationType: relation.type } })),
      ],
      layout: { name: 'preset', fit: true, padding: 48 },
      minZoom: 0.25,
      maxZoom: 2.4,
      userZoomingEnabled: false,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (element) => nodeColors[element.data('nodeType') as NodeType],
            shape: (element) => nodeShapes[element.data('nodeType') as NodeType],
            label: 'data(label)',
            color: '#3b2924',
            'font-size': '13px',
            'font-weight': 600,
            'text-wrap': 'wrap',
            'text-max-width': '112px',
            'text-valign': 'bottom',
            'text-margin-y': 10,
            'text-background-color': '#fffaf0',
            'text-background-opacity': 0.86,
            'text-background-padding': '3px',
            width: '30px',
            height: '30px',
            'border-width': '2px',
            'border-color': '#fff8ea',
          },
        },
        {
          selector: 'edge',
          style: {
            width: '1.6px',
            'line-color': (element) => edgeColors[element.data('relationType') as RelationType],
            'target-arrow-color': (element) => edgeColors[element.data('relationType') as RelationType],
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.42,
          },
        },
        { selector: 'edge[relationType = "embodies_spirit"]', style: { 'line-style': 'dashed' } },
        { selector: 'edge[relationType = "route_to"]', style: { width: '4px', opacity: 0.88, 'line-style': 'solid' } },
        { selector: '.muted', style: { opacity: 0.09 } },
        { selector: '.focus', style: { opacity: 1 } },
        { selector: 'node.selected-node', style: { width: '46px', height: '46px', 'border-width': '8px', 'border-color': '#e9b949', 'border-opacity': 0.88, 'z-index': 20 } },
        { selector: 'edge.focus', style: { width: '3px', opacity: 1, label: 'data(label)', 'font-size': '10px', 'text-background-color': '#fffaf0', 'text-background-opacity': 1, 'text-background-padding': '2px' } },
      ],
    })
    const updateViewport = () => {
      const pan = core.pan()
      setViewport({ panX: pan.x, panY: pan.y, zoom: core.zoom() })
    }
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      if (classifyWheelGesture(event) === 'pan') {
        core.panBy({
          x: -normalizeWheelDelta(event.deltaX, event.deltaMode),
          y: -normalizeWheelDelta(event.deltaY, event.deltaMode),
        })
        updateViewport()
        return
      }
      const rect = containerRef.current!.getBoundingClientRect()
      core.zoom({
        level: nextTrackpadZoom(core.zoom(), normalizeWheelDelta(event.deltaY, event.deltaMode), core.minZoom(), core.maxZoom()),
        renderedPosition: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      })
      updateViewport()
    }
    containerRef.current.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    core.on('tap', 'node', (event) => selectRef.current(event.target.id()))
    core.on('pan zoom', updateViewport)
    updateViewport()
    coreRef.current = core
    return () => {
      containerRef.current?.removeEventListener('wheel', handleWheel, true)
      core.destroy()
      coreRef.current = null
    }
  }, [nodes, relations])

  useEffect(() => {
    const core = coreRef.current
    if (!core) return
    core.elements().removeClass('muted focus selected-node')
    if (!selectedNodeId) return
    const selected = core.getElementById(selectedNodeId)
    if (!selected.length) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const neighborhood = selected.closedNeighborhood()
    core.elements().not(neighborhood).addClass('muted')
    neighborhood.addClass('focus')
    selected.addClass('selected-node')
    core.stop()
    core.animate({ center: { eles: selected }, zoom: 1.5 }, { duration: reduceMotion ? 0 : 520, easing: 'ease-in-out-cubic' })
  }, [selectedNodeId, nodes, relations])

  useEffect(() => {
    if (!didMountResetRef.current) {
      didMountResetRef.current = true
      return
    }
    const core = coreRef.current
    if (!core) return
    core.elements().removeClass('muted focus selected-node')
    core.animate({ fit: { eles: core.elements(), padding: 48 } }, { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280 })
  }, [resetSignal])

  const zoomBy = (factor: number) => {
    const core = coreRef.current
    const container = containerRef.current
    if (!core || !container) return
    const rect = container.getBoundingClientRect()
    core.zoom({
      level: Math.min(core.maxZoom(), Math.max(core.minZoom(), core.zoom() * factor)),
      renderedPosition: { x: rect.width / 2, y: rect.height / 2 },
    })
  }

  const fitGraph = () => {
    const core = coreRef.current
    if (!core) return
    core.elements().removeClass('muted')
    core.animate({ fit: { eles: core.elements(), padding: 56 } }, { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320 })
  }

  return (
    <div className="graph-frame">
      <div
        ref={containerRef}
        className="graph-canvas"
        role="img"
        aria-label={`红色文化知识图谱，共${nodes.length}个可见节点、${relations.length}条可见关系。可使用搜索结果和详情列表获得等价文本信息。`}
        data-testid="graph-canvas"
        data-pan-x={viewport.panX}
        data-pan-y={viewport.panY}
        data-zoom={viewport.zoom}
        data-focused-node={selectedNodeId ?? ''}
      />
      <div className="canvas-controls" role="group" aria-label="图谱视图控制">
        <button type="button" onClick={() => zoomBy(1.22)} aria-label="放大图谱" title="放大"><Plus size={17} /></button>
        <button type="button" onClick={() => zoomBy(0.82)} aria-label="缩小图谱" title="缩小"><Minus size={17} /></button>
        <button type="button" onClick={fitGraph} aria-label="适配完整图谱" title="适配完整图谱"><Scan size={17} /></button>
      </div>
      {selectedNodeId && <div className="focus-toast" role="status" aria-label={`已定位${nodes.find((node) => node.id === selectedNodeId)?.name ?? '目标节点'}`}>已定位 · {nodes.find((node) => node.id === selectedNodeId)?.name}</div>}
      <div className="graph-hint">双指平移 · 捏合或 ⌘/Ctrl + 双指缩放 · 点击查看史实</div>
    </div>
  )
}
