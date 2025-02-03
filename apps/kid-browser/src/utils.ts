import byteSize from 'byte-size'

export function addressFormat(address: number): string {
  return `$${address.toString(16).toUpperCase()}`
}
export function valueFormat(value: number): string {
  return `$${value.toString(16).toUpperCase()}`
}

export function getByteSize(value: number): string {
  const byteSizeResult = byteSize(value)
  return `${byteSizeResult.value}${byteSizeResult.unit} (${value} bytes)`
}

export async function executeNextTick<T>(fn: () => T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(fn())
    }, 0)
  })
}
