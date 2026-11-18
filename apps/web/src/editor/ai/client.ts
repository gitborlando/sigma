import { aiConfigSchema, type AiConfig, type AiPageSnapshot } from './schema'
import { systemPrompt } from './prompt'

// Read complete operation objects while the enclosing JSON object is still arriving.
class OperationReader {
  operations: unknown[] = []
  private prefix = ''
  private object = ''
  private started = false
  private ended = false
  private depth = 0
  private inString = false
  private escaped = false

  read(chunk: string) {
    if (this.ended) return this.operations
    if (!this.started) {
      this.prefix += chunk
      const start = /"operations"\s*:\s*\[/.exec(this.prefix)
      if (!start) return this.operations
      chunk = this.prefix.slice(start.index + start[0].length)
      this.prefix = ''
      this.started = true
    }
    for (const ch of chunk) {
      if (this.depth > 0 || ch === '{') this.object += ch
      if (this.inString) {
        if (this.escaped) this.escaped = false
        else if (ch === '\\') this.escaped = true
        else if (ch === '"') this.inString = false
        continue
      }
      if (ch === '"') {
        this.inString = true
        continue
      }
      if (ch === '{') {
        this.depth++
      } else if (ch === '}') {
        if (--this.depth === 0 && this.object) {
          try {
            this.operations.push(JSON.parse(this.object))
          } catch {
            /* skip malformed operation */
          }
          this.object = ''
        }
      } else if (ch === ']' && this.depth === 0) {
        this.ended = true
        break
      }
    }
    return this.operations
  }
}

export const requestAiEdit = async (
  config: AiConfig,
  prompt: string,
  snapshot: AiPageSnapshot | undefined,
  signal: AbortSignal,
  onProgress?: (operations: unknown[]) => void,
  onActivity?: () => void,
) => {
  const parsed = aiConfigSchema.safeParse(config)
  if (!parsed.success || !config.model.trim() || !config.apiKey.trim())
    throw new Error(t('Configure the endpoint, model and API key'))
  const promptLength = prompt.replace(/\s/g, '').length
  if (!promptLength || promptLength > 4000)
    throw new Error(t('Enter a request of at most 4000 characters'))
  let response: Response
  try {
    response = await fetch(`${parsed.data.baseURL}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        temperature: 0.2,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${snapshot ? `当前页面摘要：\n${JSON.stringify(snapshot)}\n` : '目标：新建页面，顶层父级为 @page。\n'}用户需求：\n${prompt}`,
          },
        ],
      }),
    })
  } catch {
    throw new Error(t('Network request failed or timed out'))
  }
  if (!response.ok)
    throw new Error(
      `${t('Network request failed or timed out')} (${response.status})`,
    )
  let content = ''
  const streamed = !!(
    response.body &&
    response.headers.get('content-type')?.includes('text/event-stream')
  )
  if (streamed && response.body) {
    const reader = response.body.getReader(),
      decoder = new TextDecoder()
    const operationReader = new OperationReader()
    let buffer = '',
      shown = 0
    const processLine = (line: string) => {
      if (!line.startsWith('data:')) return
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') return
      let chunk: any
      try {
        chunk = JSON.parse(data)
      } catch {
        return
      }
      onActivity?.()
      const delta = chunk.choices?.[0]?.delta?.content || ''
      content += delta
      const operations = operationReader.read(delta)
      if (operations.length !== shown) {
        shown = operations.length
        onProgress?.(operations)
      }
    }
    try {
      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() || ''
        lines.forEach(processLine)
        if (done) {
          if (buffer) processLine(buffer)
          break
        }
      }
    } catch {
      throw new Error(t('Network request failed or timed out'))
    }
  } else {
    try {
      content = (await response.json()).choices?.[0]?.message?.content || ''
    } catch {
      throw new Error(t('The response is not valid JSON'))
    }
  }
  let result: any
  try {
    result = JSON.parse(
      content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, ''),
    )
  } catch {
    throw new Error(t('The response is not valid JSON'))
  }
  const operations = Array.isArray(result)
    ? result
    : Array.isArray(result?.operations)
      ? result.operations
      : []
  if (!streamed && onProgress) {
    const step = Math.max(1, Math.ceil(operations.length / 60))
    for (let i = step; i < operations.length + step; i += step) {
      if (signal.aborted) throw new Error(t('Network request failed or timed out'))
      onProgress(operations.slice(0, i))
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  } else onProgress?.(operations)
  return result
}
