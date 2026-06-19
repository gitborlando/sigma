# @gitborlando/utils 5.0 破坏性更新记录

记录时间：2026-06-19

## 当前提交

- `c7ca41d Update gitborlando utils dependency`
  - 将 `@gitborlando/utils` 从 `^4.9.1` 升级到 `^5.0.0`
  - 更新 `pnpm-lock.yaml`
- `a3c0665 Replace utils cache helpers`
  - 将项目内 `createCache` / `createObjCache` 用法替换为 `Map`
  - 将旧的 `cache.getSet(...)` 改为 `getSet(cache, key, fn, deps)`
- `6295ff6 Add reinstall script`
  - 给 `apps/web` 添加 `re-i` 脚本

## 已处理：cache API 移除

`@gitborlando/utils@5.0.0` 移除了：

- `createCache`
- `createObjCache`

新版本保留了底层函数：

- `getSet(cache, key, fn, compare?)`

本项目已统一改为：

```ts
const cache = new Map<Key, Value>()
const value = getSet(cache, key, () => createValue(), deps)
```

注意点：

- 原 `createCache` 底层就是 `Map`，迁移为 `Map` 最接近旧行为。
- 原 `createObjCache` 也统一迁移为 `Map<string, Value>`，避免 object 缓存和 Map 缓存混用。
- `Map.set()` 返回 `Map` 本身，不返回 value；`ImgManager` 中已改成先 load、再 set、最后返回 loaded image。

## 尚未处理的破坏点

### 主入口移除或改名

- `stableIndex` 移除，5.0 中对应为 `clampIndex`
- `objectKey` 移除，5.0 中对应为 `objectId`
- `optionalSet` 移除
- `memorize` 移除
- `macroMatch` 移除
- `Is` 移除
- `IXY` 不再从 `@gitborlando/utils` 导出，应改从 `@gitborlando/geo` 或项目内类型导入
- `INoopFunc` 不再导出，可改为 `NoopFunc` 或 `() => void`

### browser 子包移除

`@gitborlando/utils/browser` 在 5.0 中只保留基础事件相关能力：

- `listen`
- `preventDefault`
- `stopPropagation`
- `isLeftMouse`
- `isRightMouse`

已移除：

- `WheelUtil`
- `StorageUtil`
- `DragData`
- `DragHelper`

项目中建议：

- `DragData` 改从 `src/global/event/drag` 导入，项目内已有定义。
- `WheelUtil` 可迁到 `src/global/event/wheel.ts`。
- `StorageUtil` 可用现有 `@sigma/utils/storage` 或在 `apps/web/src/global/storage.ts` 内部包一层 `get/set`。

### 行为变化

- `miniId()` 默认长度从 8 变为 5。
  - 如果要保持旧行为，应把裸调用改成 `miniId(8)`。
- `matchCase` 签名变化。
  - 旧版支持三参 default：`matchCase(type, fallback, cases)`
  - 新版使用对象里的 `_default`
  - 当前项目里暂时没发现三参用法，但类型返回可能变成 `R | undefined`。

## 后续建议顺序

1. 处理 `@gitborlando/utils/browser` 移除项，优先 `WheelUtil` / `StorageUtil` / `DragData`。
2. 处理主入口移除项：`stableIndex`、`objectKey`、`optionalSet`、`memorize`、`macroMatch`、`Is`。
3. 处理类型来源：`IXY`、`INoopFunc`。
4. 评估 `miniId()` 是否需要保持 8 位长度。
5. 最后再做一次针对性 `typecheck:web`。
