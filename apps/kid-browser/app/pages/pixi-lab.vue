<template>
  <div class="h-full min-h-0 space-y-3 overflow-auto p-2 text-slate-100">
    <h1 class="text-xl font-semibold">Pixi Lab</h1>
    <p class="max-w-3xl text-sm text-slate-300">
      Basic graphics sandbox with <code>pixi.js</code>, <code>pixi-viewport</code>, and
      <code>@pixi/tilemap</code>. It is meant to validate zoom/pan/selection behavior before wiring the real level
      data.
    </p>
    <PixiViewportDemo />
  </div>
</template>
