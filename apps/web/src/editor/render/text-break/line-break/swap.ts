const isBigEndian = new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x12

const swap = (b: Uint8Array, n: number, m: number) => {
  const i = b[n]
  b[n] = b[m]
  b[m] = i
}

export const swap32LE = (array: Uint8Array) => {
  if (isBigEndian) {
    const len = array.length
    for (let i = 0; i < len; i += 4) {
      swap(array, i, i + 3)
      swap(array, i + 1, i + 2)
    }
  }
}
