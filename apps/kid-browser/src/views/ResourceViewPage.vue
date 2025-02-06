<template>
  <ResourceView :resource-address="address" />
</template>

<script setup lang="ts">
import ResourceView from '@/components/ResourceView.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { fromAddressString } from '@repo/kid-util'

const route = useRoute()
const address = computed(() => fromAddressString(route.params.address as string)) // Torna reativo
</script>

<style scoped></style>
