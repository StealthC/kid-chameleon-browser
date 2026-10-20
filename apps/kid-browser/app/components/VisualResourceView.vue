<template>
  <div class="h-full min-h-0">
    <component v-if="viewer" :is="viewer.component" v-bind="viewer.props" />
    <div
      v-else
      class="border-border/60 flex h-full min-h-48 items-center justify-center rounded-lg border bg-slate-900/60 p-4 text-center text-sm text-slate-300"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import {
  isAnimationResource,
  isAnimationStepResource,
  isLevelBackgroundLayoutResource,
  isLevelEnemyLayoutResource,
  isLevelTitleCardResource,
  isLoadedResource,
  isPaletteResource,
  isPlaneResource,
  isSheetResource,
  isSpriteFrameResource,
  type AllRomResources,
} from '@repo/kid-util'

interface Props {
  resource: AllRomResources
}

const props = defineProps<Props>()

const tileSheetComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/TileSheetView.vue'),
)
const spriteFrameComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/SpriteFrameView.vue'),
)
const planeComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/PlaneView.vue'),
)
const animationComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/AnimationView.vue'),
)
const animationStepComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/AnimationStepView.vue'),
)
const paletteComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/PaletteView.vue'),
)
const unknownComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/UnknownView.vue'),
)
const levelEnemyLayoutComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/LevelEnemyLayoutView.vue'),
)
const levelBackgroundLayoutComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/LevelBackgroundLayoutView.vue'),
)
const levelTitleCardComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/LevelTitleCardView.vue'),
)

const viewer = computed(() => {
  const resource = props.resource
  if (resource.type === 'unknown') {
    return { component: unknownComponent, props: { resource } }
  }
  if (!isLoadedResource(resource)) return null
  if (isSheetResource(resource)) {
    return { component: tileSheetComponent, props: { resource } }
  }
  if (isSpriteFrameResource(resource)) {
    return { component: spriteFrameComponent, props: { resource } }
  }
  if (isPlaneResource(resource)) {
    return { component: planeComponent, props: { resource } }
  }
  if (isAnimationResource(resource)) {
    return { component: animationComponent, props: { resource } }
  }
  if (isAnimationStepResource(resource)) {
    return { component: animationStepComponent, props: { resource } }
  }
  if (isPaletteResource(resource)) {
    return { component: paletteComponent, props: { resource } }
  }
  if (isLevelBackgroundLayoutResource(resource)) {
    return { component: levelBackgroundLayoutComponent, props: { resource } }
  }
  if (isLevelEnemyLayoutResource(resource)) {
    return { component: levelEnemyLayoutComponent, props: { resource } }
  }
  if (isLevelTitleCardResource(resource)) {
    return { component: levelTitleCardComponent, props: { resource } }
  }
  return null
})

const emptyMessage = computed(() =>
  isLoadedResource(props.resource)
    ? 'No dedicated viewer for this resource type.'
    : 'Open this resource to decode it before rendering a viewer.',
)
</script>
