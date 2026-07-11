import { ArrowRight, BookOpen, MapPin, Network } from 'lucide-react'
import { graphData } from '../data/graphData'
import { nodeTypeLabels } from '../data/types'
import { getRouteStops } from '../lib/graph'

interface RouteViewProps { onOpenGraph: (nodeId: string) => void }

export default function RouteView({ onOpenGraph }: RouteViewProps) {
  const stops = getRouteStops(graphData)
  return (
    <section className="route-view" aria-labelledby="route-title">
      <div className="section-heading"><span className="eyebrow">STUDY ROUTE · SHANGHAI</span><h2 id="route-title">一条路线，三段红色记忆</h2><p>研学路线遵循真实参观次序；历史时间线作为图谱中的独立关系呈现，两者不混用。</p></div>
      <ol className="route-list">
        {stops.map((stop, index) => {
          const related = getFeaturedNodes(stop.siteScope)
          return (
            <li key={stop.id} data-testid="route-stop">
              <div className="stop-number">{String(index + 1).padStart(2, '0')}</div>
              <article>
                <div className="route-icon"><MapPin size={24} /></div>
                <span className="stop-label">第{index + 1}站 · {index === 0 ? '初心之地' : index === 1 ? '使命之窗' : '信仰之园'}</span>
                <h3>{index === 1 ? '周公馆' : stop.name.replace('上海市', '')}</h3>
                {index === 1 && <p className="formal-name">中国共产党代表团驻沪办事处旧址</p>}
                <p>{stop.summary}</p>
                <div className="route-related">
                  {related.map((node) => node && <span key={node.id}><i className={`node-marker type-${node.type}`} />{node.name}<small>{nodeTypeLabels[node.type]}</small></span>)}
                </div>
                <button type="button" onClick={() => onOpenGraph(stop.id)}>在图谱中查看 <Network size={17} /></button>
              </article>
              {index < stops.length - 1 && <div className="route-arrow" aria-hidden="true"><ArrowRight /></div>}
            </li>
          )
        })}
      </ol>
      <aside className="route-note"><BookOpen size={22} /><div><strong>研学成果如何数字化？</strong><p>将现场观察拆分为人物、地点、事件、时间、文物与精神谱系六类节点，再通过可追溯关系重新连接，让单篇心得变成可搜索、可验证、可继续扩充的数字资源。</p></div></aside>
    </section>
  )
}

function getFeaturedNodes(scope: (typeof graphData.nodes)[number]['siteScope']) {
  const siteNodes = graphData.nodes.filter((node) => node.siteScope === scope && node.isCore)
  const featured = ['person', 'event', 'artifact'].map((type) => siteNodes.find((node) => node.type === type)).filter(Boolean)
  const spirit = scope === 'longhua'
    ? graphData.nodes.find((node) => node.id === 'SPI-006')
    : graphData.nodes.find((node) => node.id === (scope === 'yida' ? 'SPI-001' : 'SPI-005'))
  return [...featured, spirit].filter(Boolean)
}
