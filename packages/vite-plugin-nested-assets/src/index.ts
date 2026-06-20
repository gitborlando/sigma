import camelcase from 'camelcase'
import fs from 'node:fs'
import path from 'node:path'
import { globSync, isDynamicPattern } from 'tinyglobby'
import type { Plugin, ResolvedConfig } from 'vite'

type GlobPattern = string | readonly string[]
type ExportAliases = Record<string, GlobPattern>

export interface VitePluginNestedAssetsOptions {
  base: string
  export?: string
  aliases?: ExportAliases
  include?: GlobPattern
  output?: string
}

interface ResolvedAlias {
  key: string
  include: GlobPattern
  base: string
}

interface ResolvedNestedAssetsOptions {
  base: string
  exportName: string
  include: GlobPattern
  aliases: ResolvedAlias[]
  output: string
}

interface AssetFile {
  parts: string[]
  key: string
  importVarName: string
  importPath: string
}

interface GenerateAssetsResult {
  fileCount: number
  output: string
}

interface AssetsTree {
  [key: string]: AssetsTree | string
}

const defaultInclude = '**/*.{svg,png,jpg,jpeg,webp,gif,avif,ico,bmp}'
const defaultExportName = 'Assets'

const normalizePath = (value: string) => path.resolve(value)

const isValidIdentifier = (value: string) =>
  /^[$A-Z_a-z][$\w]*$/.test(value) && !['default'].includes(value)

const assertValidExportName = (name: string) => {
  if (!isValidIdentifier(name)) {
    throw new Error(`[vite-plugin-nested-assets] Invalid export name: ${name}`)
  }
}

const getPatternBase = (pattern: string) => {
  const parts = pattern.replace(/\\/g, '/').split('/')
  const dynamicIndex = parts.findIndex((part) =>
    isDynamicPattern(part, { caseSensitiveMatch: true }),
  )

  if (dynamicIndex === -1) return path.dirname(pattern)

  const baseParts = parts.slice(0, dynamicIndex)

  return baseParts.length > 0 ? baseParts.join('/') : '.'
}

const getIncludeBase = (include: GlobPattern) => {
  if (typeof include === 'string') return getPatternBase(include)

  return '.'
}

const withDefaultInclude = (base: string) =>
  `${base.replace(/\/$/, '')}/${defaultInclude}`

const resolveExportPattern = (include: GlobPattern) => {
  if (typeof include !== 'string') {
    return {
      include,
      base: getIncludeBase(include),
    }
  }

  if (isDynamicPattern(include, { caseSensitiveMatch: true })) {
    return {
      include,
      base: getPatternBase(include),
    }
  }

  return {
    include: withDefaultInclude(include.replace(/\\/g, '/')),
    base: include,
  }
}

const toImportPath = (fromDir: string, file: string) => {
  const relativePath = path.relative(fromDir, file).replace(/\\/g, '/')

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

const toObjectKey = (value: string) =>
  value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

const getAssetFiles = (
  options: ResolvedNestedAssetsOptions,
  include: GlobPattern,
) => {
  if (!fs.existsSync(options.base)) return []

  const output = normalizePath(options.output)

  return globSync(include, {
    absolute: true,
    cwd: options.base,
    onlyFiles: true,
  })
    .map(normalizePath)
    .filter((file) => file !== output)
    .toSorted((a, b) =>
      path.relative(options.base, a).localeCompare(path.relative(options.base, b)),
    )
}

const pathToAssetFile = (
  filePath: string,
  options: ResolvedNestedAssetsOptions,
  base: string,
) => {
  const relativePath = path.relative(base, filePath)
  const parts = relativePath.split(path.sep)
  const fileName = path.basename(parts.at(-1) ?? '')
  const ext = path.extname(fileName)
  const nameWithoutExt = path.basename(fileName, ext)
  const pathParts = [...parts.slice(0, -1), nameWithoutExt]

  return {
    parts: parts.slice(0, -1),
    key: camelcase(nameWithoutExt),
    importVarName: camelcase(pathParts.join('-')),
    importPath: toImportPath(path.dirname(options.output), filePath),
  }
}

const buildNestedObject = (files: AssetFile[]) => {
  const result: AssetsTree = {}

  for (const file of files) {
    let current = result

    for (const part of file.parts) {
      const key = toObjectKey(part)
      const value = current[key]

      if (typeof value === 'string') continue

      if (!value) current[key] = {}

      current = current[key] as AssetsTree
    }

    current[file.key] = file.importVarName
  }

  return result
}

const generateTypeScriptCode = (obj: AssetsTree, indent = 2): string => {
  const spaces = ' '.repeat(indent)

  return Object.entries(obj)
    .map(([key, value]) => {
      if (typeof value === 'string') return `${spaces}${key}: ${value},`

      return [
        `${spaces}${key}: {`,
        generateTypeScriptCode(value, indent + 2),
        `${spaces}},`,
      ].join('\n')
    })
    .join('\n')
}

const generateImportStatements = (files: AssetFile[]) =>
  files
    .map((file) => `import ${file.importVarName} from '${file.importPath}'`)
    .join('\n')

const generateExportCode = (name: string, obj: AssetsTree) =>
  [`export const ${name} = {`, generateTypeScriptCode(obj), '} as const'].join('\n')

const uniqueFiles = (files: AssetFile[]) => {
  const map = new Map<string, AssetFile>()

  for (const file of files) {
    map.set(file.importPath, file)
  }

  return [...map.values()]
}

const generateAssets = (inputOptions: ResolvedNestedAssetsOptions) => {
  const options = {
    ...inputOptions,
    base: normalizePath(inputOptions.base),
    output: normalizePath(inputOptions.output),
  }
  const mainFiles = getAssetFiles(options, options.include).map((file) =>
    pathToAssetFile(file, options, options.base),
  )
  const aliases = options.aliases.map((item) => ({
    key: item.key,
    files: getAssetFiles(options, item.include).map((file) =>
      pathToAssetFile(file, options, item.base),
    ),
  }))
  const files = uniqueFiles([...mainFiles, ...aliases.flatMap((item) => item.files)])
  const imports = generateImportStatements(files)
  const assetsObject = buildNestedObject(mainFiles)

  for (const item of aliases) {
    if (assetsObject[item.key]) {
      throw new Error(
        `[vite-plugin-nested-assets] Alias conflicts with asset key: ${item.key}`,
      )
    }

    assetsObject[item.key] = buildNestedObject(item.files)
  }

  const exportCode = generateExportCode(options.exportName, assetsObject)
  const code = ['// 自动生成的静态资源路径常量', imports, '', exportCode, '']
    .filter((line, index) => index !== 1 || line)
    .join('\n')

  fs.mkdirSync(path.dirname(options.output), { recursive: true })
  fs.writeFileSync(options.output, code, 'utf8')

  return {
    fileCount: files.length,
    output: options.output,
  }
}

const resolveAliases = (options: VitePluginNestedAssetsOptions) => {
  return Object.entries(options.aliases ?? {}).map(([key, include]) => {
    assertValidExportName(key)
    const pattern = resolveExportPattern(include)

    return {
      key,
      include: pattern.include,
      base: pattern.base,
    }
  })
}

const resolvePluginOptions = (
  config: ResolvedConfig,
  options: VitePluginNestedAssetsOptions,
) => {
  const exportName = options.export ?? defaultExportName

  assertValidExportName(exportName)

  return {
    base: path.resolve(config.root, options.base),
    exportName,
    include: options.include ?? defaultInclude,
    aliases: resolveAliases(options).map((item) => ({
      ...item,
      base: path.resolve(config.root, options.base, item.base),
    })),
    output: path.resolve(
      config.root,
      options.output ?? path.join(options.base, 'assets.ts'),
    ),
  }
}

export const vitePluginNestedAssets = (
  options: VitePluginNestedAssetsOptions,
): Plugin => {
  let config: ResolvedConfig
  let resolvedOptions: ResolvedNestedAssetsOptions
  let timer: NodeJS.Timeout | undefined

  const logGenerated = (result: GenerateAssetsResult) => {
    config.logger.info(
      `[vite-plugin-nested-assets] Generated ${path.relative(config.root, result.output)} (${result.fileCount} assets)`,
    )
  }

  const run = () => logGenerated(generateAssets(resolvedOptions))

  const scheduleRun = () => {
    if (timer) clearTimeout(timer)

    timer = setTimeout(run, 80)
  }

  const isAssetFile = (file: string) => {
    const target = normalizePath(file)

    return (
      target !== normalizePath(resolvedOptions.output) &&
      target.startsWith(`${normalizePath(resolvedOptions.base)}${path.sep}`)
    )
  }

  return {
    name: 'vite-plugin-nested-assets',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      resolvedOptions = resolvePluginOptions(config, options)
    },
    buildStart() {
      run()
    },
    configureServer(server) {
      server.watcher.add(resolvedOptions.base)
      server.watcher.on('all', (_event, file) => {
        if (!isAssetFile(file)) return

        scheduleRun()
      })
    },
  }
}

export default vitePluginNestedAssets
