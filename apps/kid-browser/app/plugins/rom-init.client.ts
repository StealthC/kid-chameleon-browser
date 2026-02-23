import useRomStore from '~/stores/romStore'

export default defineNuxtPlugin(async () => {
  const romStore = useRomStore()
  await romStore.initFromStorage()
})
