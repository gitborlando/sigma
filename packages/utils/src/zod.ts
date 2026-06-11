export { z } from 'zod'
import { z } from 'zod'

export const parseZodRecord = <T>(schema: z.ZodType<T>, value: unknown) => {
  const record = z.record(z.unknown()).safeParse(value)
  if (!record.success) return {}

  return Object.fromEntries(
    Object.entries(record.data).flatMap(([key, item]) => {
      const result = schema.safeParse(item)
      if (!result.success) return []
      return [[key, result.data] as const]
    }),
  ) as Record<string, T>
}
