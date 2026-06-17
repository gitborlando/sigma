# editor 模块 review 索引

本次 review 只覆盖 `apps/web/src/editor`。

建议阅读顺序：

1. `overview.md`：总体架构判断、核心风险、演进顺序。
2. `schema.md`：文档模型、creator、helper、migration。
3. `math.md`：Matrix、MRect、points、bezier。
4. `y-state.md`：YState、YClients、YSync、协同与事务边界。
5. `render.md`：Elem、StageScene、StageSurface、Drawer、text-break、React reconciler。
6. `stage.md`：viewport、cursor、select/move/create、transformer、grid。
7. `handle.md`：selection、page、node、picker。
8. `operate.md`：align、geometry、fill、stroke、shadow、text、points。
9. `editor.md`：启动器、命令、undo、setting、image、mock。
10. `utils.md`：runtime selectors 与小工具。

最高优先级问题：

- schema v2 的几何事实来源还没有完全统一，`matrix/MRect` 与旧 `x/y/rotation/OBB` 混用。
- 多个服务的 hook / reaction / hotkey 生命周期没有统一 disposer。
- `YState + Undo + ClientUndo + Awareness` 的事务边界需要更明确。
- render tree 的 page switch cache、reparent、dirty rect 扩展需要优先修。
- `picker/stroke/shadow/text/points/guide/ruler/bezier` 等模块存在半成品或遗留状态，需要标记或修复。
