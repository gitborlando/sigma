# @gitborlando/vite-plugin-nested-assets

Generate a typed nested asset map from a directory.

The plugin scans static assets under `base`, creates import statements for each file, and writes an `assets.ts` file that mirrors the folder structure.

## Install

```bash
pnpm add -D @gitborlando/vite-plugin-nested-assets
```

## Usage

```ts
import vitePluginNestedAssets from '@gitborlando/vite-plugin-nested-assets'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vitePluginNestedAssets({
      base: 'src/view/assets',
    }),
  ],
})
```

With files like this:

```txt
src/view/assets/
  editor/node/rect.svg
  fav-icon/sigma-logo.png
```

The plugin generates:

```ts
export const Assets = {
  editor: {
    node: {
      rect: editorNodeRect,
    },
  },
  favIcon: {
    sigmaLogo: favIconSigmaLogo,
  },
} as const
```

Then use it in app code:

```ts
import { Assets } from 'src/view/assets/assets'

const rectIcon = Assets.editor.node.rect
```

## Options

```ts
interface VitePluginNestedAssetsOptions {
  base: string
  export?: string
  aliases?: Record<string, string | readonly string[]>
  include?: string | readonly string[]
  output?: string
}
```

- `base`: asset root directory, resolved from Vite `config.root`.
- `export`: generated export name. Defaults to `Assets`.
- `include`: glob pattern used to find assets. Defaults to common image formats.
- `output`: generated file path. Defaults to `${base}/assets.ts`.
- `aliases`: extra top-level groups generated from specific patterns.

## Naming

File and folder names are converted to camel case:

```txt
fav-icon/sigma-logo.png -> Assets.favIcon.sigmaLogo
```

If an asset key conflicts with a directory or another asset key, the file extension is appended:

```txt
foo.png
foo/bar.svg

-> Assets.fooPng
-> Assets.foo.bar
```

If generated import variable names conflict, later imports receive a number suffix.

Property names that are not valid TypeScript identifiers are emitted as string keys, so the generated file stays valid TypeScript.
