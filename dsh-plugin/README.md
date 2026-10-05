# Word Snap for DeepSeek Harness (`wordsnap-dsh`)

把 [Word Snap](../vocabulary-match.html) 词汇配对游戏原生集成进 DeepSeek Harness（DSH）：

- **GUI 内嵌游戏**：对话输入区上方出现一个 Word Snap 按钮，点开后在 GUI 内弹出练习面板（游戏本体，一字节不改）。
- **宿主工具**：agent 可以读取词库状态、导入词表、请求打开练习面板。
- **进度回传**：学习者可手动把当前学习进度摘要回传给宿主，agent 据此出下一批词。

## 安装

需要 `dsh` 与 `pnpm`（`dsh plugin add` 通过 pnpm 安装；pnpm 不在 PATH 时见下方说明）。

```sh
dsh plugin --profile desktop add /Users/guojizheng/Documents/Projects/repos/Guojiz.github.io/word-snap/dsh-plugin
```

安装后**重启 DSH 应用**。插件以 `link:` 方式依赖本目录，修改源码后重启即可生效。

pnpm 不在 PATH 时（例如只装了 DSH 桌面版），可借用桌面版自带的 pnpm：

```sh
mkdir -p /tmp/dsh-shim && cat > /tmp/dsh-shim/pnpm <<'EOF'
#!/bin/sh
exec node "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/pnpm/bin/pnpm.cjs" "$@"
EOF
chmod +x /tmp/dsh-shim/pnpm
PATH="/tmp/dsh-shim:$PATH" dsh plugin --profile desktop add <上面的路径>
```

想先在不影响日常环境的独立 profile 里试用，把 `--profile desktop` 换成新名字即可；用 `DSH_HOME=/某个临时目录` 可连整个 home 一起隔离。

## 使用

- 点输入区上方的 **Word Snap** 按钮打开面板；Esc、点背景或“关闭”收起。
- 按钮上的小圆点表示共享词库有新版本、尚未同步到本页。
- **同步词库**：把共享词库**合并**进本页的游戏存档，然后重载游戏。
- **回传进度**：把本页的学习摘要发给宿主（词数、各熟练度分布、薄弱词、轮次与得分）。
- **新窗口**：在独立标签页打开同一游戏。

### Agent 工具

| 工具 | 作用 |
| --- | --- |
| `wordsnap_status` | 读取共享词库规模、最近导入、练习地址，以及最近一次回传的进度摘要。 |
| `wordsnap_import_words` | 导入词表。`text` 接受游戏的导入格式（`en,zh` / `en=zh` / Tab / 破折号，可含 `@lang` `@round` `@time` 配置行），或用 `words: [{en, zh}]`；`mode` 为 `merge`（默认）或 `replace`。 |
| `wordsnap_open` | 请求在 GUI 中打开练习面板，可带 `reason`。每次请求只会让每个页面打开一次。 |

典型对话：“帮我整理这周的 30 个高频词，导入 Word Snap 并打开练习。”

## 架构

```
Host（Node，随 dsh 启动）                      Client（浏览器，GUI 内）
lib/host.js                                    lib/client.js
 ├─ /wordsnap/*       静态路由 → assets/        ├─ conversation.input.dock  芯片按钮
 ├─ /wordsnap-rpc/*   RPC（仅回环）             └─ shell.overlay            练习面板（iframe）
 │    status · pull · sync                           └─ 同源 iframe: /wordsnap/
 ├─ 工具 ×3 + 系统提示段（order 150）
 └─ $DSH_HOME/wordsnap/library.json（原子写入）
lib/library.js    纯逻辑：解析、去重、合并、报告规整、限额
```

关键设计：

- **同源**：游戏由宿主在 `/wordsnap/` 提供，与 GUI 页面同源，因此面板能直接读写游戏的 `localStorage`（键 `duo_like_word_match_v1`）来同步词库与汇总进度，无需改动游戏。
- **RPC 通道与页面路由不同路径**：`/wordsnap-rpc` 与 `/wordsnap`。同一个前缀不能被两个路由同时注册。
- **游戏原样分发**：`assets/vocabulary-match.html` 与上级目录的文件字节一致；`npm run sync:assets` 负责同步并保持一致。

## 边界与取舍

- **同步只合并、不删除**：浏览器侧永远不会因为同步而丢失学习者自己加的词或已有进度。`replace` 模式只替换宿主端的共享词库。
- **回传是自述**：它是浏览器本地存档的摘要，不是学习证明；agent 不应把它当作考试成绩。
- **不提供 Service Worker**：`/wordsnap/service-worker.js` 故意返回 404。公开站点的 SW 会把页面缓存到 GUI 同源下，导致插件升级后仍加载旧页面。代价是内嵌版没有离线缓存（宿主本地服务本来就在本机）。
- **仅回环**：RPC 与状态接口只接受回环来源；静态路由只服务白名单文件，且只响应 GET/HEAD。
- **有界**：单次导入最多 200000 字符 / 2000 条，共享词库最多 5000 条，字段最长 200 字符，回传薄弱词最多 50 个。
- **存储不可用时**：浏览器禁用 localStorage 时，面板退回到公开站点地址。

## 配置

在 profile 的 `cordis.yml` / 补丁里可为 `wordsnap-host` 提供：

| 键 | 默认 | 含义 |
| --- | --- | --- |
| `storeFile` | `$DSH_HOME/wordsnap/library.json` | 共享词库文件路径。 |
| `routePath` | `/wordsnap` | 页面前缀路径。仅宿主侧可配；浏览器端面板固定使用 `/wordsnap/`，改它会让面板找不到游戏，所以通常不要改。 |
| `systemPrompt` | `true` | 是否注入工具使用提示段。 |

## 开发与测试

```sh
cd word-snap/dsh-plugin
npm run sync:assets                          # 从上级目录（主检出）同步游戏资源
node scripts/sync-assets.mjs --from <目录>   # 从另一个检出/worktree 同步（新版本尚未合并到主检出时）
npm test                                     # node --test test/*.test.js（Node 26 下不要传目录）
```

**Word Snap 更新后的适配流程**：重新同步资源 → `npm test`。`game-contract.test.js` 会检查随包游戏仍使用客户端依赖的存档键、字段和设置取值范围，游戏改动了这些约定时会直接报错并指出哪一项变了；没报错就说明插件无需改动。当前随包版本包含“听单词”（浏览器 TTS，使用 `speechSynthesis`，不需要额外的 iframe 授权，浏览器不支持时游戏自行隐藏按钮）和更大的字号。

测试覆盖：词库解析与合并（`library.test.js`）、静态路由与 RPC（`host.test.js`）、`apply()` 注册的工具与输出 schema（`apply.test.js`）、客户端合并/报告逻辑与服务端渲染（`client.test.js`，找得到 React 18 时才做渲染断言）、游戏契约守卫（`game-contract.test.js`）。

`lib/client.js` 导出的 `__test` 只是测试接缝，DSH 外壳只读取 `apply` 与 `inject`。
