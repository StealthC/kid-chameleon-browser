<template>
    <div class="bg-purple-900 p-4">
        <h1 class="text-white text-2xl text-center">Read ROM</h1>
        <div v-if="rom">Rom Loaded</div>
        <ReadFile @load="onFileRead"/>
    </div>
</template>

<script setup lang="ts">
import useRomStore from '../stores/rom'
import ReadFile from './ReadFile.vue'
const {loadRom, rom} = useRomStore()
const onFileRead = (bytes: ArrayBuffer) => {
    console.log("Loading ROM File...")
    try {
        loadRom(new Uint8Array(bytes))
        console.log("ROM File Loaded")
    } catch (e) {
        console.error(e)
    }
    
}
</script>

<style scoped>

</style>