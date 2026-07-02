export function setupConsoleMaxError(enable: boolean, query = 'maxError') {
  if (!enable) return

  const This = globalThis as any
  const urlParams = new URLSearchParams(globalThis.location.search)
  const maxErrors = parseInt(urlParams.get(query) || '10', 10)

  This.__errorCount = 0
  This.addEventListener('error', () => {
    This.__errorCount++
    if (This.__errorCount >= maxErrors) {
      console.warn(`⚠️ 报错已达限制次数 (${maxErrors}次)，触发暂停！`)
      debugger
      while (true) {}
    }
  })
}
