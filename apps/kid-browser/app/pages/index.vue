<template>
  <UDashboardPanel id="overview" :ui="{ body: 'gap-0 overflow-hidden p-0' }">
    <template #header>
      <UDashboardNavbar title="Overview" icon="i-heroicons-home" class="lg:hidden" />
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
useHead({ title: 'Overview · Kid Chameleon Browser' })
</script>
