# AI 生成与修改页面

记录日期：2026-11-19。

本文是第一期实现的指导，不是已完成能力的说明。它服从 `docs/editor-operation-architecture.md`：AI 只是编辑操作的一个调用方，不另写一套文档修改逻辑，不直接写 Yjs。

节点范围按「能生成一张看得出结构的界面，并且知道下一句改什么」来定，而不是只留矩形和文本。

## 1. 这一期要完成的事

用户在编辑器里用自然语言生成一页设计，之后继续用自然语言改这一页。每次发送只产生一次撤销。

已确认的产品选择：

- 闭环包含生成和后续修改，不是只做操作层，也不是多步 Agent。
- 模型走 OpenAI 兼容接口。`baseURL`、模型名、API Key 存在本地，浏览器直连。
- 发送前由用户选择目标：**新建页面**或**当前页面**。

第一期能画出来的页面包括：登录页、定价卡、设置表单、带顶栏的简单后台。这些页面用得到容器、文字、按钮、输入框、圆形头像、色块、描边、阴影和简单渐变。用不到贝塞尔路径和图片资源。

用户路径用第 11 节的原句验收，不要用「做一个登录页」这种没有预期画面的句子。

## 2. 模型可以创建和修改的内容

节点：

- `frame`：页面分区、卡片、输入框、按钮的容器。
- `rect`：色块、分割线、图标底。
- `ellipse`：头像、圆点、圆形标志。始终是完整椭圆；宽高相等就是圆。不开放扇形和内径。
- `text`：独立文字。按钮和输入框的字必须是子文本节点，不能写进父节点的名字里。

每个节点都可以改：

- `x`、`y`、`width`、`height`：相对父级，和属性面板同一套值。
- `opacity`：0 到 1。
- `fill`：纯色，或两点线性渐变。
- `stroke`：纯色描边和宽度。用来画输入框和分割线。
- `shadow`：一层投影。用来把卡片从背景上分开。
- `radius`：只对 frame 和 rect。椭圆忽略该字段。
- 文本再加 `content`、`fontSize`、`fontWeight`、`align`、`lineHeight`。文字颜色走该文本节点的 `fill`。

`name` 用中文职责名，例如「品牌区」「登录卡片」「标题」「邮箱输入框」「主按钮」。后续修改靠摘要里的名字找到 id。

## 3. 这一期明确不做

- 不支持 line、path、group，也不支持图片填充。分割线用细 rect。成组用 frame。
- 不让模型输出原始 `matrix`、`fills`、`points`、描边对齐、虚线或任意文档路径。
- 不做多步工具循环。一次发送只请求一次补全，一次解析，一次写入。
- 不接 WebMCP / MCP。那是操作层稳定之后的适配，不是这一期的入口。
- 不把现有按钮、快捷键、画布手势迁到新操作层。AI 先走新入口，旧交互保持原样。
- 不把 API Key 放进仓库、日志、撤销描述或提示词。

## 4. 调用关系

```text
AI 面板
  收集目标、提示词、连接配置
        ↓
一次补全
  系统提示 + 当前页摘要 + 用户文本
        ↓
结构化编辑结果（Zod 校验）
        ↓
编辑操作
  预检 → 一次 Yjs 事务 → 必要时切换页面 → 一条撤销
        ↓
DocCreator 生成默认节点
DocMutator 维护父子关系
几何字段规则写入 x / y / width / height / radius
```

面板负责输入和展示。模型只返回下面第 6 节的结构。编辑操作负责校验、写入和历史。`DocCreator`、`DocMutator`、`DesignGeom` 的字段规则继续负责默认值和几何约束。

操作必须绑定当前 `Editor` 会话里的 `YDoc`。不要新增模块级的 `docGetter`，也不要先改选区再改节点。

## 5. 写入前的读取

修改当前页时，请求前读取该页摘要，放进提示词。新建页面时不读旧节点，只告诉模型父级占位是 `@page`。

摘要只包含模型能改的信息：

```ts
type AiPageSnapshot = { pageId: string; pageName: string; nodes: AiSnapshotNode[] }

type AiSnapshotNode = {
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
  shadow?: AiShadow
  radius?: number
  text?: {
    content: string
    fontSize: number
    fontWeight: number
    align: 'left' | 'center' | 'right'
    lineHeight: number
  }
}

type AiFill =
  | { type: 'solid'; color: string }
  | { type: 'linear'; from: string; to: string; angle: number }

type AiShadow = {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
}
```

读取规则：

- 从当前页出发，只遍历这一页的子树。
- `frame`、`rect`、`ellipse`、`text` 输出完整字段。line、path、group 标记为 `unsupported`，只保留 `id`、`type`、`name`、`parentId`。
- `x`、`y`、`width`、`height` 使用 `DocHelper.getMRect(node)` 的对应字段。这是相对父级的坐标，不是页面世界坐标，也不是原始矩阵。
- 纯色填充输出 `{ type: 'solid', color }`。两点线性渐变按节点本地坐标换算成 `angle`：0 表示从左到右，90 表示从上到下。渲染里的 `start`、`end` 是节点宽高上的 0 到 1。图片填充和多于两个色标的渐变不翻译，填充字段省略。
- 描边只在存在可见纯色时输出。阴影只输出第一层可见阴影。
- 文本颜色放在文本节点的 `fill` 里。
- 读取不改文档，不改选区。
- 当前页节点超过 200 个时拒绝发送，并提示页面太大。不要静默截断。

坐标约定要写进系统提示：子节点的 `x`、`y` 相对父 frame 的左上角；顶层节点相对页面。页面本身没有有限宽高。

## 6. 模型必须返回的结构

使用 Zod 做运行时校验，并拒绝未知字段。解析失败、字段不支持、引用不存在，整次结果丢弃，文档保持原样。

```ts
type AiEditResult = { summary: string; operations: AiOperation[] }

type AiOperation =
  | { op: 'create'; id: string; parentId: string; node: AiCreateNode }
  | { op: 'update'; id: string; changes: AiNodeChanges }
  | { op: 'delete'; id: string }

type AiCreateNode = {
  type: 'frame' | 'rect' | 'ellipse' | 'text'
  name?: string
  x: number
  y: number
  width: number
  height: number
  opacity?: number
  fill?: AiFill
  stroke?: { color: string; width: number } | null
  shadow?: AiShadow | null
  radius?: number
  text?: {
    content: string
    fontSize?: number
    fontWeight?: number
    align?: 'left' | 'center' | 'right'
    lineHeight?: number
  }
}

type AiNodeChanges = Partial<Omit<AiCreateNode, 'type' | 'text'>> & {
  text?: Partial<NonNullable<AiCreateNode['text']>>
}
```

约定：

- 新建页面时，顶层节点的 `parentId` 固定为 `@page`。客户端先创建真正的页面，再把 `@page` 替换成新页面 id。
- 修改当前页时，已有节点必须使用摘要里的真实 id。新节点使用 `$` 加 1 到 16 位字母、数字、下划线或连字符，例如 `$avatar`。客户端再换成 `miniId(8)`。
- `summary` 用作用户可见的撤销说明，最长 80 字。空则使用「AI 编辑」。
- 一次最多 120 个操作，树深最多 8 层。一张登录页通常在 40 个节点以内。
- 文本最长 500 字。`width`、`height` 必须是有限正数，单边不超过 10000。`x`、`y` 必须是有限数字。
- 颜色只接受 `#RRGGBB`。纯色走 `DocCreator.fillColor`。线性渐变走 `DocCreator.fillLinear`，客户端把 `angle` 换成节点本地的 `start`、`end`，两个色标偏移为 0 和 1。
- `stroke: null` 表示去掉可见描边。有值时用 `DocCreator.solidStroke` 覆盖。`shadow: null` 表示清空阴影。有值时用 `DocCreator.shadow` 写成单元素数组。
- `radius` 只对 frame 和 rect 有效，小于 0 时视为非法。`opacity` 超出 0 到 1 时视为非法。
- `text` 只对文本节点有效。未给的字体字段保持 `DocCreator.text` 的默认值。
- 创建时未给 `name`，用 `DocCreator.createNodeName`。系统提示仍要求模型给出中文职责名。
- `delete` 删除该节点及其后代。`unsupported` 节点不允许 `update` 或 `delete`。
- 不支持的字段直接失败，不要丢掉字段后假装成功。

几何写入复用现有字段规则，不手写矩阵：

- 位置写入 `DocHelper.getMRect` 的 `x`、`y`，再把得到的 `matrix` 写回节点。
- 尺寸走 `DocMutator.setNodeSize`。
- 半径写 `radius`。椭圆不写半径。
- 父子关系走 `DocMutator.addNodes` 和 `insertChildAt`。

创建对象时先用 `DocCreator.frame`、`rect`、`ellipse`、`text` 得到完整默认节点，再覆盖允许的字段。

## 7. 一次发送怎么落地

目标是新建页面：

1. 校验连接配置和提示词。提示词为空，或去掉空白后超过 4000 字，则不请求。
2. 请求模型。系统提示规定结构、坐标和节点限制。用户文本只作为页面需求。
3. 校验结果。任一操作的 `parentId` 不是 `@page` 或本批新建 id，就整批失败。
4. 在内存里生成真实 id、完整节点和父子顺序。此阶段不写文档。
5. 确认编辑器会话仍是发送时的会话。
6. 一次 `yDoc.transact`：创建页面、写入节点、挂上 `childIds`。
7. 选中新页面。选区变化由 `Select` 已注册的撤销切片负责。
8. 有实际文档变化时，调用一次 `undo.track('all', summary)`。
9. 把视口移到新内容附近。视口变化不必承诺可撤销。

目标是当前页面：

1. 读取摘要。没有当前页则停止。
2. 记录发送时的页面 id 和一个内容标记。标记用该页子树里相关节点的 id、父子关系和可编辑字段组成，能判断「请求期间页面变过」即可。
3. 请求模型，把摘要放进提示词。
4. 返回后再次读取。页面 id 不同或内容标记变化，则丢弃结果，提示页面已变化，请重新发送。不要把旧结果写进新文档。
5. 预检全部通过后，一次事务按顺序执行删除、更新、创建。删除先于创建，避免同批 id 冲突。创建时父节点必须已经存在于文档或本批更早的创建中。
6. 不因为 AI 编辑去改写用户当前的节点选区。新建页面是唯一需要切换页面的情况。
7. 没有实际变化则不记历史。有变化则一条 `undo.track('all', summary)`。

事务期间不要调用现有的 `PageAction.addPage` 或 `NodeAction.deleteSelectedNodes`。它们会自己切选区并单独记历史，一次用户发送会被拆成多条撤销。

`YDoc.transact` 失败不会自动回滚。所以事务里只做已经预检过的写入，不在事务里解析模型结果、不在事务里发请求。预检失败时文档必须和发送前一致。

## 8. 模型和连接

请求：

- `POST {baseURL}/chat/completions`
- `Authorization: Bearer {apiKey}`
- 非流式。消息只有一条 system 和一条 user。
- 要求模型只返回 JSON 对象，不返回 Markdown。
- 温度使用较低值。超时 60 秒。同一面板同时只允许一个请求；后一次发送会忽略前一次的返回。
- 编辑器销毁或面板关闭后，丢弃尚未应用的返回。

连接配置单独存放，不放进现有 `editor.setting`：

- 存储键使用独立的 `editor.ai`
- 用 `@gitborlando/toolkit` 的 `createZodStorage` 校验
- 字段为 `baseURL`、`model`、`apiKey`
- `baseURL` 必须是 `http` 或 `https`，去掉末尾斜杠
- 三个字段都非空才能发送
- 界面用密码框展示 API Key，不写入撤销、不打到控制台

浏览器直连意味着密钥会出现在用户本机，并且会被发到用户填写的主机。界面上用一句短说明写清楚这一点。不要把密钥同步到协作文档或 Yjs。

默认值可以预填 `baseURL` 为 `https://api.openai.com/v1`，模型名留空，由用户填写。不要在代码里写死可用密钥。

## 9. 界面

在顶栏加一个入口，打开现有 `DragPanel`，标题为 AI。不要为了这一期改左侧图层结构。

面板内容：

- 连接区：`baseURL`、模型名、API Key。
- 目标：分段选择「新建页面」「当前页面」。记住上一次选择。
- 多行输入和发送按钮。请求中禁用发送，并显示进行中的状态。
- 输入框下方放第 11 节的四句示例，点击填入输入框，不自动发送。
- 成功后展示模型的 `summary`。
- 失败时展示可读原因：未配置、网络失败、返回不是 JSON、校验失败、页面已变化、页面过大。不要展示原始密钥，也不要把整段模型原文直接塞进文档。

样式沿用现有 linaria 和面板控件，保持顶栏按钮的尺寸和 ghost 风格。文案走现有 i18n。

## 10. 建议放置的代码

都在 `apps/web` 内，文件名使用 kebab-case：

- `src/editor/ai/schema.ts`：摘要、编辑结果和连接配置的 Zod 类型。
- `src/editor/ai/read-page.ts`：从当前会话读取 `AiPageSnapshot`。
- `src/editor/ai/apply-edit.ts`：预检、建节点、一次事务、一次历史。
- `src/editor/ai/client.ts`：一次补全请求。
- `src/editor/ai/prompt.ts`：系统提示。
- `src/view/editor/ai/panel.tsx`：面板和顶栏入口。

`apply-edit` 作为 `Editor` 的服务注册，这样它能拿到当前会话的 `DocCreator`、`DocMutator`、`YDoc`、`Select`、`Undo`。纯校验和摘要转换不要放进服务。

不要新增命令注册中心，也不要把这套结构暴露成通用插件 API。

## 11. 系统提示要写死的约束

系统提示用中文，并包含：

- 只返回一个 JSON 对象，结构与第 6 节一致。
- 只能使用 frame、rect、ellipse、text。
- 坐标相对父级，原点在左上角，`y` 向下。
- 新建页面的顶层父级是 `@page`。先放一个顶层 frame 作为画板，子元素放进它里面。
- 每个节点都写中文职责名。文字放在 text 节点里。按钮至少包含一个 frame 和一个 text。输入框用带描边和圆角的 frame。
- 需要层次时使用纯色、线性渐变、描边和一层阴影。头像和标志用 ellipse。
- 修改时只能引用摘要中的 id；新 id 必须是 `$` 开头的临时 id。优先按摘要里的 `name` 找到要改的节点，不要重建整页。
- 不要复述 API Key、不要解释、不要使用 Markdown。
- 常见桌面页的顶层 frame 宽 1440，高按内容在 800 到 1200 之间，四周留出边距。

用户原文放在 user 消息里，不拼进系统提示的规则段，避免用户文本覆盖约束。

## 12. 验收时怎么说

面板里提供这四句，按顺序发送。前一句选「新建页面」，后三句选「当前页面」。

1. 「做一张桌面登录页。顶层画板 1440×900，浅灰背景。左侧深色品牌区，放圆形标志、产品名 Sigma 和一句短说明。右侧白色圆角卡片，带浅阴影。卡片内有标题「登录」、一行说明、邮箱和密码两个描边输入框，以及蓝色圆角主按钮「继续」。节点用中文职责命名。」
2. 「把主按钮改成绿色，按钮文字改成进入工作台。」
3. 「把标题改成欢迎回来，并在标题上方加一个 64×64 的浅灰圆形头像。」
4. 「删掉密码输入框。」

看画布和图层面板，不看模型原文：

- 第 1 句之后能看出左右分区、圆形标志、白卡片、两个输入框和蓝色按钮。图层里有「品牌区」「登录卡片」「主按钮」这类名字。
- 第 2 句只改按钮的颜色和文字，卡片和其他文字还在。
- 第 3 句标题变成「欢迎回来」，标题上方多一个圆。
- 第 4 句密码输入框及其文字消失，邮箱输入框还在。
- 每一句都可以单独撤销。撤销第 1 句后，新建的页面消失。

另外确认失败路径：

- 未配置连接时不能发送，文档不变。
- 模型返回未知字段、非法颜色、不存在的 id，或请求期间页面变过，文档和选区都不变。
- 当前页里的 path、line、group 不会被改写或删除。
- 连续发送两次时，只有最后一次结果可能写入。
- 不打开面板、不发请求时，现有创建、选择、撤销和渲染行为不变。

## 13. 实现顺序

1. 写 Zod schema 和当前页读取，用一个现有页面确认摘要坐标与属性面板一致。
2. 写预检和应用。先用一份手写的登录页 JSON 打通新建和后续三句修改，先不接网络。这份 JSON 要覆盖渐变或纯色、描边、阴影、椭圆和文本。
3. 补一次撤销和「页面已变化则放弃」的保护。
4. 接 OpenAI 兼容请求和系统提示。
5. 最后做面板、顶栏入口、示例句子和连接配置。

每一步都不改无关的图层、渲染和手势代码。
