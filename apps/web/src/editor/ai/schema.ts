import { z } from 'zod'

const number = z.number().finite()
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
export const aiFillSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('solid'), color }).strict(),
  z
    .object({ type: z.literal('linear'), from: color, to: color, angle: number })
    .strict(),
])
const stroke = z.object({ color, width: number.nonnegative() }).strict()
const shadow = z
  .object({
    offsetX: number,
    offsetY: number,
    blur: number.nonnegative(),
    spread: number,
    color,
  })
  .strict()
const text = z
  .object({
    content: z.string().max(500),
    fontSize: number.positive().optional(),
    fontWeight: number.positive().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    lineHeight: number.positive().optional(),
  })
  .strict()
const fields = {
  name: z.string().optional(),
  x: number,
  y: number,
  width: number.positive().max(10000),
  height: number.positive().max(10000),
  opacity: number.min(0).max(1).optional(),
  fill: aiFillSchema.optional(),
  stroke: stroke.nullable().optional(),
  shadow: shadow.nullable().optional(),
  radius: number.nonnegative().optional(),
  text: text.optional(),
}
const createNode = z
  .object({ type: z.enum(['frame', 'rect', 'ellipse', 'text']), ...fields })
  .strict()
const changes = z
  .object({
    ...fields,
    x: fields.x.optional(),
    y: fields.y.optional(),
    width: fields.width.optional(),
    height: fields.height.optional(),
    text: text.partial().optional(),
  })
  .strict()
export const aiEditSchema = z
  .object({
    summary: z.string().max(80),
    operations: z
      .array(
        z.discriminatedUnion('op', [
          z
            .object({
              op: z.literal('create'),
              id: z.string().regex(/^\$[\w-]{1,16}$/),
              parentId: z.string(),
              node: createNode,
            })
            .strict(),
          z.object({ op: z.literal('update'), id: z.string(), changes }).strict(),
          z.object({ op: z.literal('delete'), id: z.string() }).strict(),
        ]),
      )
      .max(120),
  })
  .strict()
export const aiConfigSchema = z
  .object({
    baseURL: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//i.test(value))
      .transform((value) => value.replace(/\/+$/, '')),
    model: z.string(),
    apiKey: z.string(),
  })
  .strict()
export type AiFill = z.infer<typeof aiFillSchema>
export type AiEditResult = z.infer<typeof aiEditSchema>
export type AiConfig = z.infer<typeof aiConfigSchema>
export type AiSnapshotNode = {
  id: string
  type: 'frame' | 'rect' | 'ellipse' | 'text' | 'unsupported'
  name: string
  parentId: string
  childIds?: string[]
  x?: number
  y?: number
  width?: number
  height?: number
  opacity?: number
  fill?: AiFill
  stroke?: { color: string; width: number }
  shadow?: {
    offsetX: number
    offsetY: number
    blur: number
    spread: number
    color: string
  }
  radius?: number
  text?: {
    content: string
    fontSize: number
    fontWeight: number
    align: 'left' | 'center' | 'right'
    lineHeight: number
  }
}
export type AiPageSnapshot = {
  pageId: string
  pageName: string
  nodes: AiSnapshotNode[]
}
