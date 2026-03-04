type UltraHDREncoder = (payload: {
  base: ImageData
  gainmap: ImageData
  width: number
  height: number
}) => Promise<Uint8Array | ArrayBuffer | { data: Uint8Array } | Uint8Array>

const resolveEncoder = (module: Record<string, unknown>) => {
  const candidates = [
    module.encodeUltraHDR,
    module.encodeUHDR,
    module.encode,
    module.default && (module.default as Record<string, unknown>).encodeUltraHDR,
    module.default && (module.default as Record<string, unknown>).encode,
  ]
  return candidates.find((candidate) => typeof candidate === 'function') as
    | UltraHDREncoder
    | undefined
}

export const encodeUltraHDR = async (base: ImageData, gainmap: ImageData) => {
  const module = (await import('libultrahdr-wasm')) as Record<string, unknown>
  const init = module.default
  if (typeof init === 'function') {
    await (init as () => Promise<void>)()
  }
  const encoder = resolveEncoder(module)
  if (!encoder) {
    throw new Error('libultrahdr-wasmのエンコーダーが見つかりません。')
  }
  const result = await encoder({
    base,
    gainmap,
    width: base.width,
    height: base.height,
  })
  const data =
    result instanceof Uint8Array
      ? result
      : result instanceof ArrayBuffer
        ? new Uint8Array(result)
        : result.data
  return new Blob([data], { type: 'image/jpeg' })
}
