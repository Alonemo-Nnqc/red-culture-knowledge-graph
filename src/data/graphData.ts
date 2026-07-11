import nodesJson from './raw/nodes.json'
import relationsJson from './raw/relations.json'
import sourcesJson from './raw/sources.json'
import { graphSchema } from './schema'

export const graphData = graphSchema.parse({
  nodes: nodesJson,
  relations: relationsJson,
  sources: sourcesJson,
})
