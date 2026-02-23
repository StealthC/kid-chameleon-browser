<template>
  <RequiresRom>
    <main class="grid h-full min-h-0 gap-3 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <div class="min-h-0">
        <ResourceList />
      </div>
      <div class="min-h-0 overflow-hidden">
        <GlassPanel class="flex h-full items-center justify-center text-center">
          <p class="text-muted-foreground text-sm">
            Select a resource to inspect details and raw data.
          </p>
        </GlassPanel>
      </div>
    </main>
  </RequiresRom>
</template>
