import { ExternalLink, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { graphData } from '../data/graphData'
import { nodeTypeLabels, relationTypeLabels, type GraphNode } from '../data/types'

interface DetailPanelProps {
  node: GraphNode
  onClose: () => void
  onSelectNode: (nodeId: string) => void
}

export default function DetailPanel({ node, onClose, onSelectNode }: DetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    return () => previousFocusRef.current?.focus()
  }, [])
  useEffect(() => {
    panelRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [node.id, onClose])

  const related = graphData.relations.filter((relation) => relation.source === node.id || relation.target === node.id)
  const sourcesById = new Map(graphData.sources.map((source) => [source.id, source]))

  return (
    <aside ref={panelRef} className="detail-panel" role="dialog" aria-modal="false" aria-label={`${node.name}详情`} tabIndex={-1}>
      <div className="detail-topline">
        <span className={`type-pill type-${node.type}`}>{nodeTypeLabels[node.type]}</span>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情"><X size={20} /></button>
      </div>
      <h2>{node.name}</h2>
      {node.aliases.length > 0 && <p className="aliases">又称：{node.aliases.join('、')}</p>}
      <p className="detail-summary">{node.summary}</p>
      {node.type === 'event' && node.narrative ? (
        <section className="event-narrative" aria-label="事件史实详解">
          <NarrativeSection index="01" title="历史背景" body={node.narrative.background} />
          <NarrativeSection index="02" title="事件经过" body={node.narrative.process} />
          <NarrativeSection index="03" title="结果与影响" body={node.narrative.significance} />
          <NarrativeSection index="04" title="史料口径" body={node.narrative.sourceNote} />
        </section>
      ) : <p>{node.description}</p>}
      {Object.keys(node.attributes).length > 0 && (
        <dl className="attribute-list">
          {Object.entries(node.attributes).map(([key, value]) => value !== null && <div key={key}><dt>{attributeLabel(key)}</dt><dd>{attributeValue(value)}</dd></div>)}
        </dl>
      )}
      <section>
        <h3>关联脉络 <span>{related.length}</span></h3>
        <div className="relation-list">
          {related.map((relation) => {
            const otherId = relation.source === node.id ? relation.target : relation.source
            const other = graphData.nodes.find((item) => item.id === otherId)
            return other && (
              <article key={relation.id}>
                <button type="button" onClick={() => onSelectNode(other.id)}>
                  <span>{relationTypeLabels[relation.type]}</span>
                  <strong>{other.name}</strong>
                  <small>{relation.claim}</small>
                </button>
                <details>
                  <summary>查看关系证据（{relation.citations.length}）</summary>
                  {relation.citations.map((citation, index) => {
                    const source = sourcesById.get(citation.sourceId)
                    return source && <div key={`${citation.sourceId}-${index}`}><strong>{source.title}</strong><span>{citation.locator}</span><blockquote>{citation.evidenceExcerpt}</blockquote></div>
                  })}
                </details>
              </article>
            )
          })}
        </div>
      </section>
      <section>
        <h3>来源与证据</h3>
        <div className="source-cards">
          {node.citations.map((citation, index) => {
            const source = sourcesById.get(citation.sourceId)
            return source && (
              <article key={`${citation.sourceId}-${index}`}>
                <div className="source-meta"><span>{source.authorityTier}级来源</span><span>{source.publisher}{source.hostPublisher ? ` · 载于${source.hostPublisher}` : ''}</span></div>
                <h4>{source.title}</h4>
                <p className="locator">定位：{citation.locator}</p>
                <blockquote>{citation.evidenceExcerpt}</blockquote>
                {source.canonicalUrl && <a href={source.canonicalUrl} target="_blank" rel="noopener noreferrer">查看原始来源 <ExternalLink size={14} /></a>}
              </article>
            )
          })}
        </div>
      </section>
    </aside>
  )
}

function NarrativeSection({ index, title, body }: { index: string; title: string; body: string }) {
  return <article><span>{index}</span><div><h3>{title}</h3><p>{body}</p></div></article>
}

function attributeLabel(key: string): string {
  const labels: Record<string, string> = {
    roles: '身份', placeSubtype: '地点类型', modernAddress: '旧址现址', historicalAddress: '历史门牌', visitorAddress: '参观地址', longitude: '经度', latitude: '纬度',
    eventSubtype: '事件类型', startDate: '开始时间', endDate: '结束时间', datePrecision: '时间精度', precision: '时间精度', certainty: '说明',
    artifactSubtype: '展项类型', authenticity: '性质', year: '年代', currentHolder: '收藏/管理单位', heritageLevel: '文物级别',
    spiritSubtype: '精神类型', formulationStatus: '表述状态', interpretationOrigin: '解释来源',
  }
  return labels[key] ?? key
}

function attributeValue(value: string | number | boolean): string {
  const values: Record<string, string> = { original: '原件', replica: '复制品', reconstruction: '复原场景/展陈', not_applicable: '不适用', official: '正式表述', curatorial: '场馆阐释' }
  return values[String(value)] ?? String(value)
}
