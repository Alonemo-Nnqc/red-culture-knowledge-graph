import { z } from 'zod'
import { nodeTypes, recordKinds, relationTypes, siteScopes } from './types'

const citationSchema = z.object({
  sourceId: z.string().min(1),
  locator: z.string().min(1),
  evidenceExcerpt: z.string().min(1),
})

const eventNarrativeSchema = z.object({
  background: z.string().min(30),
  process: z.string().min(60),
  significance: z.string().min(30),
  sourceNote: z.string().min(15),
})

const dateLikeSchema = z.string().regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/, '日期须为 ISO 8601 年、年月或年月日')

export const nodeSchema = z.object({
  id: z.string().regex(/^(PER|PLC|EVT|TIM|ART|SPI)-\d{3}$/),
  type: z.enum(nodeTypes),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  siteScope: z.enum(siteScopes),
  summary: z.string().min(10),
  description: z.string().min(20),
  isCore: z.boolean(),
  recordKind: z.enum(recordKinds),
  routeStopOrder: z.number().int().min(1).max(3).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  citations: z.array(citationSchema).min(1),
  layout: z.object({ x: z.number().finite(), y: z.number().finite() }),
  narrative: eventNarrativeSchema.optional(),
}).superRefine((node, context) => {
  const prefixByType = { person: 'PER', place: 'PLC', event: 'EVT', time: 'TIM', artifact: 'ART', spirit: 'SPI' }
  if (!node.id.startsWith(prefixByType[node.type])) {
    context.addIssue({ code: 'custom', message: '节点 ID 前缀与类型不一致', path: ['id'] })
  }
  if (node.type === 'artifact' && !['original', 'replica', 'reconstruction', 'not_applicable'].includes(String(node.attributes.authenticity))) {
    context.addIssue({ code: 'custom', message: '文物必须注明 original、replica、reconstruction 或 not_applicable', path: ['attributes', 'authenticity'] })
  }
  if (node.type === 'event' && !node.narrative) {
    context.addIssue({ code: 'custom', message: '事件节点必须包含结构化长叙事', path: ['narrative'] })
  }
  if (node.type !== 'event' && node.description.length < 60) {
    context.addIssue({ code: 'custom', message: '非事件节点介绍不得少于60字', path: ['description'] })
  }
  for (const key of ['startDate', 'endDate', 'birthDate', 'deathDate']) {
    const value = node.attributes[key]
    if (typeof value === 'string' && !dateLikeSchema.safeParse(value).success) {
      context.addIssue({ code: 'custom', message: `${key} 不是合法日期`, path: ['attributes', key] })
    }
  }
  for (const key of ['longitude', 'latitude']) {
    const value = node.attributes[key]
    if (typeof value === 'number') {
      const valid = key === 'longitude' ? value >= -180 && value <= 180 : value >= -90 && value <= 90
      if (!valid) context.addIssue({ code: 'custom', message: `${key} 超出合法范围`, path: ['attributes', key] })
    }
  }
})

export const relationSchema = z.object({
  id: z.string().regex(/^REL-\d{3}$/),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(relationTypes),
  label: z.string().min(1),
  claim: z.string().min(8),
  sequenceScope: z.enum(siteScopes).optional(),
  order: z.number().int().positive().optional(),
  isCore: z.boolean(),
  recordKind: z.enum(recordKinds),
  citations: z.array(citationSchema).min(1),
})

export const sourceSchema = z.object({
  id: z.string().regex(/^SRC-\d{3}$/),
  title: z.string().min(1),
  publisher: z.string().min(1),
  hostPublisher: z.string().min(1).optional(),
  sourceType: z.enum(['official_museum', 'party_history', 'government', 'archive', 'academic', 'publication', 'onsite_label', 'activity_record']),
  authorityTier: z.enum(['S', 'A', 'B', 'C']),
  author: z.string().optional(),
  photoCredit: z.string().optional(),
  publicationDate: dateLikeSchema.optional(),
  canonicalUrl: z.url().optional(),
  identifier: z.string().optional(),
  accessedAt: z.iso.date(),
  rights: z.string().min(1),
  notes: z.string(),
})

export const graphSchema = z.object({
  nodes: z.array(nodeSchema),
  relations: z.array(relationSchema),
  sources: z.array(sourceSchema),
})
