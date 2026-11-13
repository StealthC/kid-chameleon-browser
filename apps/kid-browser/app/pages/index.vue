<template>
  <UDashboardPanel id="overview" :ui="{ body: 'gap-0 overflow-hidden p-0' }">
    <template #header>
      <UDashboardNavbar title="Overview" icon="i-heroicons-home">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton v-if="!rom" icon="i-heroicons-arrow-up-tray" size="sm" @click="openRomDialog">
            Load ROM
          </UButton>
          <UButton
            v-else
            icon="i-heroicons-squares-2x2"
            color="neutral"
            variant="soft"
            size="sm"
            to="/resources"
          >
            Resources
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RequiresRom>
        <div class="h-full overflow-y-auto">
          <div class="mx-auto w-full max-w-[110rem] p-4 sm:p-6">
            <RomDetails />
          </div>
        </div>
      </RequiresRom>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'

useHead({ title: 'Overview · Kid Chameleon Browser' })

const { rom } = storeToRefs(useRomStore())
const { openRomDialog } = useRomDialog()
</script>
