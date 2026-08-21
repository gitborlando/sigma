import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { format, resolveConfig } from 'prettier'

type SchemaColumn = {
  table: string
  column: string
  type: string
  udtType: string
  nullable: boolean
  default: string | null
  identity: boolean
}

const [, , inputArg = 'schema.json', outputArg = 'src/cloudbase.ts'] = process.argv
const inputPath = resolve(inputArg)
const outputPath = resolve(outputArg)
const schemaStart = '// generated schema start'
const schemaEnd = '// generated schema end'

const unwrapJson = (value: unknown): unknown => {
  if (typeof value === 'string') return unwrapJson(JSON.parse(value))
  if (Array.isArray(value) && value.length === 1) {
    const [item] = value
    if (item && typeof item === 'object' && 'jsonb_pretty' in item)
      return unwrapJson(item.jsonb_pretty)
  }
  if (value && typeof value === 'object' && 'jsonb_pretty' in value)
    return unwrapJson(value.jsonb_pretty)
  return value
}

const isSchemaColumn = (value: unknown): value is SchemaColumn => {
  if (!value || typeof value !== 'object') return false
  const column = value as Record<string, unknown>
  return (
    typeof column.table === 'string' &&
    typeof column.column === 'string' &&
    typeof column.type === 'string' &&
    typeof column.udtType === 'string' &&
    typeof column.nullable === 'boolean' &&
    (typeof column.default === 'string' || column.default === null) &&
    typeof column.identity === 'boolean'
  )
}

const parseColumns = (source: string) => {
  const value = unwrapJson(JSON.parse(source))
  if (!Array.isArray(value) || !value.every(isSchemaColumn))
    throw new Error('输入 JSON 不是有效的数据库字段数组')
  return value
}

const scalarTypeMap: Record<string, string> = {
  bigint: 'number',
  bigserial: 'number',
  boolean: 'boolean',
  bool: 'boolean',
  bytea: 'string',
  date: 'string',
  decimal: 'number',
  float4: 'number',
  float8: 'number',
  inet: 'string',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  integer: 'number',
  json: 'unknown',
  jsonb: 'unknown',
  money: 'number',
  numeric: 'number',
  real: 'number',
  serial: 'number',
  serial2: 'number',
  serial4: 'number',
  serial8: 'number',
  smallint: 'number',
  smallserial: 'number',
  text: 'string',
  time: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  timetz: 'string',
  uuid: 'string',
  varchar: 'string',
}

const getScalarType = (type: string, udtType: string) => {
  const normalizedType = type.toLowerCase()
  const normalizedUdtType = udtType.toLowerCase()
  if (scalarTypeMap[normalizedUdtType]) return scalarTypeMap[normalizedUdtType]
  if (scalarTypeMap[normalizedType]) return scalarTypeMap[normalizedType]
  if (normalizedType.includes('character') || normalizedType.includes('time'))
    return 'string'
  if (normalizedType === 'double precision') return 'number'
  if (normalizedType === 'user-defined') return 'string'
  return 'unknown'
}

const getTypeScriptType = ({ type, udtType, nullable }: SchemaColumn) => {
  const isArray = type.toLowerCase() === 'array' || udtType.startsWith('_')
  const scalarType = getScalarType(isArray ? '' : type, udtType.replace(/^_/, ''))
  const valueType = isArray ? `${scalarType}[]` : scalarType
  return nullable ? `${valueType} | null` : valueType
}

const quoteProperty = (name: string) => JSON.stringify(name)

const generateFields = (
  columns: SchemaColumn[],
  mode: 'row' | 'insert' | 'update',
) =>
  columns
    .map((column) => {
      const optional =
        mode === 'update' ||
        (mode === 'insert' &&
          (column.nullable || column.default !== null || column.identity))
      return `          ${quoteProperty(column.column)}${optional ? '?' : ''}: ${getTypeScriptType(column)}`
    })
    .join('\n')

const generateTable = (
  table: string,
  columns: SchemaColumn[],
) => `      ${quoteProperty(table)}: {
        Row: {
${generateFields(columns, 'row')}
        }
        Insert: {
${generateFields(columns, 'insert')}
        }
        Update: {
${generateFields(columns, 'update')}
        }
        Relationships: []
      }`

const generateSchema = (columns: SchemaColumn[]) => {
  const tables = new Map<string, SchemaColumn[]>()
  for (const column of columns) {
    const tableColumns = tables.get(column.table) ?? []
    tableColumns.push(column)
    tables.set(column.table, tableColumns)
  }

  const tableTypes = [...tables]
    .map(([table, tableColumns]) => generateTable(table, tableColumns))
    .join('\n')

  return `${schemaStart}
// This section is generated. Do not edit it manually.
export interface PublicSchema {
  Tables: {
${tableTypes}
  }
  Views: { [_ in never]: never }
  Functions: { [_ in never]: never }
  Enums: { [_ in never]: never }
  CompositeTypes: { [_ in never]: never }
}
${schemaEnd}
`
}

const replaceSchema = (source: string, schema: string) => {
  const start = source.indexOf(schemaStart)
  if (start === -1) return `${source.trimEnd()}\n\n${schema}`

  const end = source.indexOf(schemaEnd, start)
  if (end === -1) throw new Error(`找不到生成区块结束标记：${schemaEnd}`)
  return `${source.slice(0, start)}${schema}${source.slice(end + schemaEnd.length)}`
}

const inputSource = await readFile(inputPath, 'utf8')
const outputSource = await readFile(outputPath, 'utf8')
const columns = parseColumns(inputSource)
const prettierConfig = await resolveConfig(outputPath)
const output = await format(replaceSchema(outputSource, generateSchema(columns)), {
  ...prettierConfig,
  filepath: outputPath,
})
await writeFile(outputPath, output, 'utf8')

console.log(`Generated ${outputPath} from ${columns.length} columns.`)
