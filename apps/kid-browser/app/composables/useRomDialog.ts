export function useRomDialog() {
  const open = useState<boolean>('rom-loader-dialog-open', () => false)

  function openRomDialog() {
    open.value = true
  }

  function closeRomDialog() {
    open.value = false
  }

  return {
    open,
    openRomDialog,
    closeRomDialog,
  }
}
