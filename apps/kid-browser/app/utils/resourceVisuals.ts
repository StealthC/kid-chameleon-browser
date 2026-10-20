import type { ResourceType } from '@repo/kid-util'

export const VISUAL_RESOURCE_TYPES = [
  'sheet',
  'unlinked-sprite-frame',
  'linked-sprite-frame',
  'plane',
  'animation',
  'animation-step',
  'palette',
  'level-background-layout',
  'level-enemy-layout',
  'level-title-card',
] as const satisfies readonly ResourceType[]

export type VisualResourceType = (typeof VISUAL_RESOURCE_TYPES)[number]

const VISUAL_RESOURCE_TYPE_SET = new Set<string>(VISUAL_RESOURCE_TYPES)

export function isVisualResourceType(type: ResourceType): type is VisualResourceType {
  return VISUAL_RESOURCE_TYPE_SET.has(type)
}
