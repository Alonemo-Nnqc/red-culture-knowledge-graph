import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { graphData } from '../src/data/graphData'
import { validateGraph } from '../src/data/validate'

const errors = validateGraph(graphData)
if (errors.length) throw new Error(`数据校验失败：\n${errors.join('\n')}`)

function csvEscape(value: unknown): string {
  const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '\uFEFF'
  const headers = Object.keys(rows[0])
  return `\uFEFF${headers.map(csvEscape).join(',')}\r\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')).join('\r\n')}\r\n`
}

const outputDir = resolve('public/data')
await mkdir(outputDir, { recursive: true })
await Promise.all([
  writeFile(resolve(outputDir, 'graph.json'), `${JSON.stringify(graphData, null, 2)}\n`),
  writeFile(resolve(outputDir, 'nodes.csv'), toCsv(graphData.nodes as unknown as Record<string, unknown>[])),
  writeFile(resolve(outputDir, 'relations.csv'), toCsv(graphData.relations as unknown as Record<string, unknown>[])),
  writeFile(resolve(outputDir, 'sources.csv'), toCsv(graphData.sources as unknown as Record<string, unknown>[])),
])
console.log(`已生成 ${outputDir} 下的 JSON 与三张 CSV。`)
