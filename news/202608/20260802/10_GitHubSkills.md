# 10_GitHubSkills

> **生成日期**：2026-08-02 | **搜索时段**：2026-07-26 07:00 ~ 2026-08-02 07:00
> **总条数**：6 条

---

### 1. 【worldmonitor：AI 驱动的实时全球情报仪表盘】（⭐ 74.2k）

> 📍 **导语**：在一个信息过载、地缘冲突频发的时代，如何把分散在 500 多个新闻源和数十个数据提供商里的信号，汇成一块能一眼看懂的"世界态势图"？koala73/worldmonitor 给出的答案是：用 AI 自动写简报、用 3D 地球把事件落点画出来。它在 2026-07-26 的 GitHub 周榜新增 +12,085 Star，总 Star 已达 74,240，是本周增长最快的"应用层"开源项目之一，值得所有关注宏观与地缘信号的开发者收藏。

---

**⭐ 项目数据速览**

- **语言 / 架构**：TypeScript 为主，桌面端基于 Tauri 2（Rust 内核），体积远小于 Electron
- **当前 Star**：74,240（本期周榜 +12,085）
- **数据接入**：聚合 500+ 新闻源、65+ 外部数据提供商
- **可视能力**：3D 地球 + WebGL 平面地图引擎，内置 56 种图层
- **AI 能力**：支持基于 Ollama 的本地模型运行，离线也能生成简报
- **对外接口**：自带 MCP 服务器、REST API、CLI 与多语言 SDK
- **核心模块**：国家动荡指数评分、金融雷达、基础设施跟踪

**▌ 它是什么**

worldmonitor 是一个开源的实时全球情报与态势感知仪表盘。它把"新闻聚合 + 地缘政治监控 + 基础设施跟踪"三件事塞进一个统一的界面里，并用 AI 把原始信息自动提炼成简报。和普通新闻聚合器不同，它强调"空间感"——每个事件都会在 3D 地球上找到落点，配合国家动荡指数、金融雷达等量化指标，让分析师和决策者一眼看清"哪里正在发生什么、影响半径多大"。它既能在浏览器里跑（WebGL 地图），也提供 Tauri 2 打包的桌面客户端，还暴露 MCP 服务器，意味着它可以作为工具被 Claude、Cursor 等 AI 客户端直接调用。

**▌ 它解决了什么问题**

传统的信息监测有三个痛点：第一，信源太散，要看清一个地区的事态得同时盯十几个媒体和数据站；第二，缺乏"空间上下文"，文字新闻很难让人直观理解事件影响的地理范围；第三，依赖云端大模型有隐私与延迟问题。worldmonitor 用"聚合 + 地图 + 本地 AI"的组合拳解决：500+ 信源统一进一个面板，56 种图层把抽象事件变成可见的热区，Ollama 本地推理让敏感机构可以完全离线使用。对智库、媒体、跨境电商风控、安全运营（SOC）团队来说，这意味着把"每天刷两小时新闻"压缩成"每天看两分钟仪表盘"。

**▌ 原理拆解（含安装/使用步骤）**

worldmonitor 的数据流可以概括为一个管线：

```
输入: 500+ RSS/API 新闻源 + 65+ 数据提供商(经济/军事/灾害)
  ↓
采集层: 定时拉取 + 去重 + 实体识别(国家/组织/坐标)
  ↓
AI 层: Ollama 本地模型生成简报、计算国家动荡指数
  ↓
可视化层: 3D 地球/WebGL 地图渲染(56 种图层)+ 金融雷达面板
  ↓
输出: 仪表盘 Web UI / 桌面客户端 / MCP 工具 / REST API
```

从零启动（以 Docker 为例，最省环境依赖）：

```bash
# 1. 克隆仓库
git clone https://github.com/koala73/worldmonitor
cd worldmonitor
# 2. 用 Docker Compose 一键拉起后端 + 地图服务
docker compose up -d
# 3. 打开浏览器访问 http://localhost:3000
# 4. （可选）配置本地 Ollama，让简报生成完全离线
ollama pull llama3.1
# 在 .env 中设置 OLLAMA_BASE_URL=http://localhost:11434
```

如果你更想用桌面端，可下载 Tauri 2 打包的客户端，它比 Electron 应用启动更快、内存占用更低，且天然支持系统通知。需要把 worldmonitor 接进自己的 AI 工作流时，启用内置 MCP 服务器，Claude Code 等工具就能直接查询"某国当前动荡指数"或"某区域近 24 小时事件"。

**▌ 动手验证**

光看文档不过瘾，下面这组命令让你十分钟内亲手验证 worldmonitor 真的能跑起来并产出简报：

```bash
# 1. 克隆并启动（Docker 方式，依赖最少）
git clone https://github.com/koala73/worldmonitor
cd worldmonitor
docker compose up -d
# 2. 等容器就绪后访问仪表盘
open http://localhost:3000
```

验证要点（动手检查）：
- 打开页面后，确认 3D 地球上已加载默认图层（至少看到"新闻热区"与"国家动荡指数"两层）。
- 在终端查看后端日志：`docker compose logs -f`，应能看到定时拉取 500+ 信源的调度任务在跑，验证采集层真实工作。
- 若已装 Ollama，执行 `ollama pull llama3.1` 并在 `.env` 配 `OLLAMA_BASE_URL=http://localhost:11434`，然后在面板点"生成简报"，验证离线 AI 简报确实出现——无外网也能生成即证明本地推理链路打通。
- MCP 自测：在 Claude Code 的 `mcp` 配置中加入 worldmonitor 服务器地址，发送"查询日本当前动荡指数"，应返回数值而非报错，验证对外工具接口可用。

三项验证全中（地球能渲染 / 简报能生成 / MCP 能问答），即说明"聚合+地图+本地AI"三能力都真实可用，而非只停留在 README 的截图里。

**▌ 对比选型表**

| 维度 | worldmonitor | GDELT | NewsMap |
|------|--------------|-------|---------|
| 数据可视化 | 3D地球强 | 弱 | 地图中等 |
| 本地AI | Ollama支持 | 无 | 无 |
| MCP接口 | 内置 | 无 | 无 |
| 上手难度 | 中 | 难 | 易 |
| 适合场景 | 态势感知 | 研究挖掘 | 新闻浏览 |

**▌ 学习路线**

前置：了解 RSS、REST API 与基础地图概念（GeoJSON、经纬度）。入门：先跑 Docker 版看默认面板；进阶：改 `.env` 接入自己的信源、用 Ollama 换本地模型、基于 REST API 写自动化告警；今日行动：clone 仓库，十分钟跑起本地仪表盘，订阅一个你关心的地区。

---

🔗 **信息来源**：GitHub 仓库 koala73/worldmonitor（⭐ 74,240，2026-07-26 周榜）/ GitHub Trending 周榜 2026-07-26（51cto 转载）/ GitHub Trending 周榜综述（CSDN agent.csdn.net，2026-07-26）

---

### 2. 【code-review-graph：给 AI 审查建代码图谱省 8 倍 Token】（⭐ 26.4k）

> 📍 **导语**：AI 编码工具每次任务都恨不得把整个代码库重新读一遍，token 像漏水一样消失。tirth8205/code-review-graph 用 Tree-sitter 给代码库建一张"结构地图"，让 AI 只读取真正受变更影响的文件——基准测试平均省下 8.2 倍 token。它本周 Star 涨到 26,412（较 7 月中的 21.8k 又上了一大截），并新增了对 14 个 AI 编码平台的一键配置支持，是"代码智能图谱"方向最落地的开源方案。

---

**⭐ 项目数据速览**

- **作者 / 语言**：tirth8205，Python 3.10+，MIT 许可
- **当前 Star**：26,412（本期周榜 +6,423）
- **核心机制**：Tree-sitter AST 解析 → SQLite 图谱 → MCP 工具（30 个）
- **性能数据**：平均 8.2× token 缩减；2900 文件仓库增量更新 < 2 秒
- **覆盖范围**：19 种语言 + Jupyter 笔记本
- **平台支持**：Claude Code、Cursor、Copilot、Zed、Windsurf 等 14 个
- **存储**：`.code-review-graph/` 本地目录，零网络依赖

**▌ 它是什么**

code-review-graph（简称 CRG）是一个"本地优先"的代码智能图谱工具。它用 Tree-sitter 把代码库解析成一张图：节点是函数、类、导入，边是调用、继承、测试覆盖关系。基于这张图，它在 AI 做代码审查或回答问题时，只把"变更爆炸半径"内的文件喂给模型，而不是整库扫描。它对外暴露 30 个 MCP 工具，AI 助手可以直接问"这次改动影响了哪些地方、哪些测试需要重跑"。

**▌ 它解决了什么问题**

AI 编码助手最大的隐性成本是会"重新读全库"。一个 500 文件的仓库，每次评审都可能把上万行无关代码塞进上下文，既烧钱又容易让模型被噪声带偏。CRG 的"爆炸半径分析"精准定位真正受影响的调用者、依赖者和测试，把上下文从"全库"缩到"必要集合"。开源评测显示：在 fastapi 上从 4,944 token 降到 614（8.1×），在 flask 上从 44,751 降到 4,252（9.1×），在 gin 上甚至达到 16.4×。对大仓库团队和重度使用 Claude Code/Cursor 的开发者，这就是实打实的成本与质量双重收益。更隐蔽的收益在"准确率"上：爆炸半径分析保证 100% 召回——凡是真正被改动波及的文件一个都不会漏，平均 F1 达 0.54。这意味着 AI 不会因为少读了一个被调用的工具函数而给出错误的安全结论。在金融、基础设施这类"漏一个文件就可能引入线上事故"的场景里，这种"宁可多读、绝不漏读"的保证，比单纯省钱更关键。需要留意的是 express 这类单文件小包场景，图谱元数据本身可能比原文件还大（缩减 <1×），此时直接读文件更划算——CRG 的价值在跨多文件改动时才真正放大。

**▌ 原理拆解（含安装/使用步骤）**

```
输入: 代码库源码
  ↓
Tree-sitter 解析: 生成 AST，抽取函数/类/导入/调用点
  ↓
建图: 节点(函数/类) + 边(调用/继承/测试覆盖) 存入 SQLite
  ↓
变更hook: git commit / 文件保存触发增量 diff(基于 SHA-256)
  ↓
爆炸半径查询: 从变更文件回溯调用者/依赖者/测试
  ↓
MCP 输出: AI 只读取最小文件集(8.2× token 缩减)
```

五分钟上手：

```bash
# 1. 安装（建议先装 uv 以获得最佳 MCP 配置体验）
pip install code-review-graph
# 或: pipx install code-review-graph
# 2. 一键检测并配置本机所有 AI 编码工具
code-review-graph install
# 3. 构建图谱
code-review-graph build
# 4. 在编辑器里对 AI 说:
#    "Build the code review graph for this project"
```

`install` 会自动识别你装了哪些平台（Claude Code、Cursor、Copilot…），写入正确的 MCP 配置并注入 graph-aware 指令；首次构建 500 文件项目约 10 秒，之后每次 git 提交自动增量更新（2900 文件 < 2 秒）。它用三层边置信度评分（EXTRACTED/INFERRED/AMBIGUOUS）标注关系可靠度，让 AI 知道哪些调用是确定的、哪些只是推测。

**▌ 动手验证**

用真实仓库验证 CRG 真的能砍掉 token，而不是只看官方数字：

```bash
pip install code-review-graph
cd 你自己的一个项目   # 任意含多文件的仓库
code-review-graph install   # 自动配置本机 AI 编码工具
code-review-graph build     # 构建图谱
```

验证要点（动手检查）：
- `build` 完成后，检查本地生成了 `.code-review-graph/` 目录，用 `sqlite3 .code-review-graph/graph.db ".tables"` 能看到节点表，证明图谱确实落盘、不是内存玩具。
- 在 Claude Code/Cursor 里做一处跨文件改动，观察发送给模型的上下文是否明显变短——用 CRG 提供的评估脚本对比前后 token：跑 `python -m code_review_graph.evaluate` 应能看到类似 8× 的缩减比例，验证官方基准可复现。
- 增量更新自测：改一个文件后再次 `build`，终端应显示耗时 < 2 秒（2900 文件规模下），验证增量 diff 生效而非全量重建。
- MCP 自测：在编辑器对话中输入"这次改动影响了哪些测试？"，AI 应只列出爆炸半径内的测试文件，而不是整库扫描，验证 30 个 MCP 工具已正确注入。

三项验证（图谱落盘 / token 缩减可复现 / 增量<2秒）全通过，即可确认 CRG 不是营销话术，而是真实可用的成本利器。

**▌ 对比选型表**

| 维度 | CRG | codebase-memory-mcp | GraphRAG |
|------|-----|---------------------|----------|
| 定位 | 代码审查省token | 代码知识图谱 | 文档知识图谱 |
| 解析 | Tree-sitter | tree-sitter | 文本切分 |
| 增量更新 | <2秒 | 支持 | 较慢 |
| 语言数 | 19+ | 158 | 不限 |
| 适合 | 评审/编码 | 问答检索 | RAG检索 |

**▌ 学习路线**

前置：用过 Claude Code/Cursor，了解 MCP 基本概念。入门：装好跑通 `build` 看 token 缩减；进阶：读 `evaluate/results` 复现基准、用 CI 的 GitHub Action 做风险评分；今日行动：在常用项目里 `pip install` 后 `install`，观察评审时的上下文变化。

---

🔗 **信息来源**：GitHub 仓库 tirth8205/code-review-graph（⭐ 26,412，2026-07-26 周榜）/ 掘金《开源项目第162期:code-review-graph》（2026-07）/ model-context-protocol.com 客户端页（CRG 官方文档）

---

### 3. 【OmniRoute：内置 MCP 与 Token 压缩的免费 AI 网关】（⭐ 30.2k）

> 📍 **导语**：当你同时用 Claude、GPT、Gemini、DeepSeek，会被 API Key 和限流折磨到崩溃。diegosouzapw/OmniRoute 是一个本地优先的免费 AI 网关：一个端点接入 230+ 模型供应商（90+ 免费），内置 MCP 服务器和能把工具调用 token 压掉 85–95% 的压缩管线。它本周 Star 达 30,152（周榜 +11,147），相较 7 月底的版本，MCP/A2A 与压缩引擎已成为核心卖点，是"模型路由层"里最锋利的一把瑞士军刀。

---

**⭐ 项目数据速览**

- **作者 / 许可**：diegosouzapw，MIT
- **当前 Star**：30,152（本期周榜 +11,147）
- **供应商**：237 家（90+ 免费），聚合月免费 token 约 16 亿
- **路由策略**：17 种，含 auto/coding、auto/fast、auto/cheap 等
- **压缩**：RTK + Caveman 等 10 引擎，工具场景 85–95%
- **原生能力**：内置 MCP 服务器（95 工具 / 30 权限域）、A2A
- **延迟开销**：每请求 50–150ms
- **部署**：npm 全局 / Docker / Electron 桌面 / PWA

**▌ 它是什么**

OmniRoute 是一个跑在你本机的 AI 网关，把几乎所有主流模型（GPT、Claude、Gemini、DeepSeek、GLM…）聚合成一个 OpenAI 兼容端点 `http://localhost:20128/v1`。上层把 Cursor、Claude Code 等工具的 API Base 指向它即可，无需改密钥。它的价值不只是"聚合"：当某家额度用完，它在毫秒级自动切到下一个可用供应商（零停机）；内置的 RTK+Caveman 压缩引擎在工具调用场景能砍掉 85–95% 的 token；更内置完整 MCP 服务器，让智能体通过网关统一调用文件读写、代码执行等系统能力。

**▌ 它解决了什么问题**

AI 开发者日常被三件事折磨：API Key 满天飞（每家模型一个）、频繁撞限流（写着代码突然"额度不足"）、token 账单失控（工具调用反复回传大段 diff 和日志）。OmniRoute 一一破解：统一端点消灭多 Key 管理；auto 模式按质量/成本/延迟自动编排并带配额感知回退；压缩管线把工具输出这种"高冗余文本"大幅瘦身。免费层（如 OpenCode Free、Kiro AI、Pollinations）开箱即用、无需 Key，配合聚合的 16 亿月免费 token，个人开发者几乎可以零成本 coding。从工程视角看，OmniRoute 还顺手解决了"可观测性"难题：Dashboard 实时显示每个请求的路由去向、token 消耗、压缩比和延迟，让你第一次能看清"我的 AI 编码到底烧了多少钱、卡在哪一家"。多人或团队场景里，它也能作为统一出口做配额治理——把有限的付费额度集中调度，免费层兜底，避免每个人各自囤 Key、各自撞墙。它也不是银弹：每请求 50–150ms 的转发开销对交互式聊天可感知，对 coding agent 则几乎无感；要解锁全 237 家需注册十几个账号，且项目迭代极快，生产环境务必锁定版本号。

**▌ 原理拆解（含安装/使用步骤）**

```
请求: Cursor/Claude Code 发往 localhost:20128/v1
  ↓
路由层: 按 auto/coding 等策略选供应商 + 配额感知回退
  ↓
压缩层: RTK/Caveman 压缩工具输出(85-95%)
  ↓
转发层: 翻译为各家 API 格式(含 Anthropic 兼容)
  ↓
MCP 层: 智能体经网关调用文件/执行等 95 个工具
  ↓
响应: 统一 OpenAI 格式返回
```

五分钟上手（npm 推荐）：

```bash
# 1. 安装（需 Node.js 22.22.2+）
npm install -g omniroute
# 2. 启动服务
omniroute start
# 服务默认运行在 http://localhost:20128/v1
# 3. 配置编码工具指向网关
#    Claude Code: 设置 API Base URL = http://localhost:20128/v1
#    Cursor: 设置自定义 API 端点同上
# 4. 使用 auto 模式（在模型名处填）
auto/coding   # 代码生成优先
auto/cheap    # 成本优先(免费算力)
auto/smart    # 质量优先 + 10% 探索
```

也可 `docker run -p 20128:20128 diegosouzapw/omniroute` 或用 Electron 桌面端可视化查看 token 消耗。注意：要解锁全 237 家需注册 15–20 个账号；生产环境建议锁定版本（项目迭代极快，配置格式偶有变动）。

**▌ 动手验证**

亲手把 OmniRoute 接进编码工具，验证"零限流 + 自动路由"是否名副其实：

```bash
npm install -g omniroute
omniroute start
# 浏览器打开 http://localhost:20128 查看 Dashboard
```

验证要点（动手检查）：
- 将 Claude Code 的 API Base URL 设为 `http://localhost:20128/v1`，模型名填 `auto/coding`，发一条代码请求，面板应显示该请求被路由到某家免费供应商，验证网关转发链路通。
- 配额回退自测：临时把常用供应商额度耗尽（或断网某家），再次请求，观察 Dashboard 是否自动切到下一可用供应商、零报错，验证 auto 模式的零停机回退。
- 压缩比自测：用带工具调用的复杂任务（如"读某文件并改写"），对比关闭压缩与开启 RTK/Caveman 时的 token 计数，Dashboard 应显示工具场景压缩 85–95%，验证压缩引擎真实生效。
- MCP 自测：通过网关调用一个 MCP 工具（如文件读写），验证 95 个内置工具经网关统一可用，而非各家单独配。

转发通 + 自动回退 + 压缩比可见，三项全中即说明 OmniRoute 的"聚合/路由/压缩"三能力真实落地，不是画饼。

**▌ 对比选型表**

| 维度 | OmniRoute | LiteLLM | OpenRouter |
|------|-----------|---------|------------|
| 本地优先 | 是 | 是 | 否(云) |
| 免费层 | 90+ | 1-5 | 无 |
| Token压缩 | 10引擎 | 无 | 无 |
| 内置MCP | 是 | 否 | 否 |
| 供应商数 | 237 | ~50 | ~300 |

**▌ 学习路线**

前置：用过至少一种 AI 编码工具、理解 OpenAI 兼容 API。入门：npm 装好连免费供应商跑通；进阶：配 `providers.yaml` 做成本优先路由、接 MCP 给智能体加系统工具；今日行动：装上 omniroute，把 Claude Code 的 base URL 指过去，设 `auto/coding` 体验零限流编码。

---

🔗 **信息来源**：GitHub 仓库 diegosouzapw/OmniRoute（⭐ 30,152，2026-07-26 周榜）/ dev.to《OmniRoute: Free AI Gateway with 231 LLM Providers (2026 Review)》/ 腾讯云社区《21K Star!登上 GitHub 趋势榜 Top3 的 AI 网关项目!》

---

### 4. 【aisuite：吴恩达开源的大模型统一调用接口库】（⭐ 15.6k）

> 📍 **导语**：吴恩达（Andrew Ng）团队开源的 andrewyng/aisuite，解决了一个所有多模型开发者的老痛点：每家厂商的 SDK 都不一样，换模型就得改一整套调用代码。aisuite 用一套接近 OpenAI 风格的接口统一了 OpenAI、Anthropic、Google、Ollama 等主流提供商，并原生支持 Agents API、Toolkits 与 MCP。它本周 Star 约 15.6k，配套桌面应用 OpenCoworker 也已发布，是"把模型变成可替换零件"理念最干净的工程实现。

---

**⭐ 项目数据速览**

- **作者 / 许可**：andrewyng，MIT（商用/非商用免费）
- **当前 Star**：约 15.6k
- **两层能力**：统一 Chat Completions API + 一等公民 Agents API
- **提供商**：OpenAI、Anthropic、Google、Mistral、HuggingFace、AWS、Ollama 等
- **Agents 特性**：Toolkits（文件/Git/Shell）、MCP 原生、状态存储、工具策略
- **配套应用**：OpenCoworker 桌面 AI 同事（macOS/Windows）
- **安装**：`pip install aisuite` 或 `pip install 'aisuite[all]'`

**▌ 它是什么**

aisuite 是一个轻量 Python 库，分两层：底层是跨提供商的统一 Chat Completions API，模型名用 `provider:model` 格式，改一家模型只需改一个字符串；上层是一等公民的 Agents API，让你声明一个 Agent、挂上工具包（文件、Git、Shell 预制工具或任意 MCP 服务器），用 Runner 跑多轮任务。它还把工具策略（RequireApprovalPolicy、allow/deny 列表）、状态存储（内存/文件/Postgres 可恢复对话）、产物与追踪（tracing）都做进了生产级骨架。换句话说，它既是"统一调用层"，也是"Agent 构建层"。

**▌ 它解决了什么问题**

在多模型时代，团队常陷进"厂商锁定"：业务代码里硬编码了某家的 SDK，想换模型要么重写、要么维护多套分支。aisuite 把模型调用、函数工具、MCP、状态保存和执行整合到同一轻量框架，切换模型只是改 `anthropic:claude-sonnet-4-6` 为 `openai:gpt-4o`。它还顺手解决了"工具调用标准化"——普通 Python 函数可直接注册为 Agent 工具，多轮"调用工具→读结果→继续"自动循环，省去手写胶水。对同时接多家模型、又想避免被绑死的 Python 开发者，这是性价比极高的基础设施。更深层的好处是"可复现与可治理"。因为所有调用都经过 aisuite 一层，你可以统一做日志、做用量统计、做模型版本的灰度切换——今天让 10% 流量走新模型、观察质量后再全量。Agents API 里的 StateStore 还能把一次长任务的对话状态持久化到 Postgres，进程崩了也能从断点续跑，而不是从头再来。配套开源的 OpenCoworker 桌面应用（macOS/Windows）则把这套能力 packaged 成"会读文件、发邮件、出报告"的 AI 同事，数据留在本地，可自带 Key 也可完全用 Ollama 本地模型，是轻量团队自动化的一条捷径。需要警惕的是：aisuite 仍偏"编排层"，复杂的 Agent 工作流编排、记忆与检索还得自己接 RAG 框架。

**▌ 原理拆解（含安装/使用步骤）**

```
Chat 层: client.chat.completions.create(model="provider:model", ...)
  ↓ 统一请求/响应结构(与 OpenAI 兼容)
Agents 层: Agent(name, model, instructions, tools) + Runner.run
  ↓ 多轮循环: LLM → 工具调用 → 结果回灌 → 完成/达 max_turns
Toolkits: files/git/shell 预制工具 或 任意 MCP server
  ↓
策略/状态: ToolPolicy 管控 + StateStore 持久化续跑
```

五分钟上手：

```bash
pip install aisuite          # 基础包
# 或: pip install 'aisuite[anthropic]'  # 带特定厂商 SDK
export ANTHROPIC_API_KEY="..."   # 设置密钥
```

```python
import aisuite as ai
from aisuite import Agent, Runner

client = ai.Client()
# 统一聊天：只改 model 字符串即可换厂商
r = client.chat.completions.create(
    model="openai:gpt-4o",
    messages=[{"role":"user","content":"你好"}])
# Agents API：声明带工具包的 Agent
agent = Agent(
    name="repo-helper",
    model="anthropic:claude-sonnet-4-6",
    instructions="你是严谨的仓库助手，用工具从代码作答。",
    tools=[*ai.toolkits.files(root="."), *ai.toolkits.git(root=".")],
)
result = Runner.run(agent, "上次提交改了什么？用 3 条总结。")
print(result.final_output)
```

原生 MCP 用法：`pip install 'aisuite[mcp]'` 后，把任意 MCP server 作为 `tools=[{"type":"mcp",...}]` 传入即可，无需额外胶水代码。

**▌ 动手验证**

用三行代码验证 aisuite 真的能让"换模型只改一个字符串"，再验证 Agent 与 MCP 能力：

```bash
pip install aisuite
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
```

```python
import aisuite as ai
client = ai.Client()
# 第一次用 OpenAI
r1 = client.chat.completions.create(model="openai:gpt-4o",
    messages=[{"role":"user","content":"用一句话解释 PAKE。"}])
print(r1.choices[0].message.content)
# 第二次只改 model 字符串切到 Claude，其余代码一字不改
r2 = client.chat.completions.create(model="anthropic:claude-sonnet-4-6",
    messages=[{"role":"user","content":"用一句话解释 PAKE。"}])
print(r2.choices[0].message.content)
```

验证要点（动手检查）：
- 两段调用除 `model` 字符串外完全一致，却分别返回 GPT 与 Claude 的回答，验证"统一接口"真实成立、换厂商无需改业务代码。
- Agents API 自测：装 `pip install 'aisuite[all]'`，用 `Agent` + `ai.toolkits.files` 声明一个能读本地文件的 Agent，跑 `Runner.run(agent, "列出当前目录的 .py 文件")`，应返回真实文件列表，验证工具包与多轮循环可用。
- MCP 自测：`pip install 'aisuite[mcp]'`，把一个 MCP server 作为 `tools=[{"type":"mcp",...}]` 传入，验证原生 MCP 接入无需额外胶水代码。

"换模型只改字符串 + Agent 能调工具 + 原生 MCP"三验证全过，即证明 aisuite 的"模型可替换零件"理念可落地，而非仅停留在接口声明。

**▌ 对比选型表**

| 维度 | aisuite | LiteLLM | OpenAI SDK |
|------|---------|---------|------------|
| 统一接口 | 是 | 是 | 否(单家) |
| Agents API | 内置 | 需自搭 | 需自搭 |
| MCP原生 | 是 | 否 | 否 |
| 工具策略 | 内置 | 无 | 无 |
| 适合 | 多模型Agent | 路由网关 | 单厂商 |

**▌ 学习路线**

前置：会 Python、用过至少一家 LLM API。入门：跑通 `provider:model` 切换；进阶：用 Agents API + Toolkits 写文件整理助手、读 `docs/agents-quickstart.md` 学策略与状态存储；今日行动：pip 装上，用三行代码在 GPT 和 Claude 间切换一次。

---

🔗 **信息来源**：GitHub 仓库 andrewyng/aisuite（⭐ 约 15.6k，MIT）/ 今日头条《吴恩达开源:一套API接入多模型,还能构建智能体》（2026-07-28）/ aisuite 官方 README（Chat Completions / Agents / MCP 章节）

---

### 5. 【RuView：用 WiFi 信号做无摄像头人体姿态感知】（⭐ 86.4k）

> 📍 **导语**：你家的 WiFi 路由器除了上网，还能"看见"你的动作、监测你的心跳和呼吸——甚至穿墙。ruvnet/RuView（原名 WiFi DensePose）是一个用普通 WiFi 信道状态信息（CSI）做人体姿态估计、生命体征监测和存在检测的开源系统，完全不需要摄像头。它本周 Star 约 86,389，Rust 实现把处理流水线推到 54,000 帧/秒，是"环境感知"范式里最出圈的前沿项目，代表了 AI 感知从"牺牲隐私"到"隐私优先"的转向。

---

**⭐ 项目数据速览**

- **作者 / 语言**：ruvnet，Rust 53% + Python 25% + JS，MIT
- **当前 Star**：约 86,389（本期周榜 +5,313）
- **核心能力**：17 个 COCO 关键点姿态、呼吸/心率、穿墙检测
- **性能**：实时 < 100 微秒/帧；Rust 重写达 54,000 帧/秒（约 810× Python）
- **硬件**：最低 9 美元 ESP32-S3 节点，全本地运行
- **部署**：Docker 一键（amd64/arm64）、ESP32 固件、WASM 浏览器
- **准确率**：姿态估计达摄像头方案的 94.2%

**▌ 它是什么**

RuView 把 WiFi 信号变成"非接触式传感器"。人体移动（甚至呼吸起伏）会改变无线电波的散射模式，RuView 捕捉 CSI（每个子载波的幅度与相位），用注意力网络、图算法和智能压缩替代手工阈值，反推出人体骨骼坐标、生命体征和存在状态。它输出的是"骨架而非人影"——不采集任何图像，因此天然规避摄像头在卧室、养老院、卫生间的隐私难题。系统包含 6 阶段处理流水线（信号清理 → 基于图的空间推理 → 姿态输出），并提供 5 个面板的 Three.js 全息仪表盘。

**▌ 它解决了什么问题**

摄像头方案有三道坎：隐私（敏感场所装不了）、死角（需直视、怕遮挡）、环境依赖（暗光/烟雾失效）。RuView 用无线电波穿透墙体、家具和烟雾，且零视觉数据采集。在养老监护场景，它能在不装摄像头的前提下监测老人是否跌倒、呼吸是否正常；在智能家居，它做存在感应自动开关灯而不拍下任何人；在安防，它替代摄像头保护员工隐私。硬件成本极低（单节点 9 美元 ESP32），且全本地推理、无云账号、无 recurring 费用，把"感知"真正 democratize 到个人开发者。

**▌ 原理拆解（含安装/使用步骤）**

```
信号发射: ESP32 发送 WiFi 信号
  ↓
环境扰动: 人体移动→多径效应改变 CSI(幅度/相位)
  ↓
CSI采集: 接收端捕获子载波时序变化
  ↓
特征提取: 分析 CSI 时间序列微弱模式(穿墙/呼吸/心跳)
  ↓
AI推理: 神经网络映射为 17 关键点姿态 / 生命体征
  ↓
输出: 骨架坐标(非图像) + 存在热图 + 生命体征预言机
```

快速体验（Docker 一键，无需工具链）：

```bash
# 30 秒内实现实时感知(支持 amd64/arm64，含苹果芯片)
docker pull ruvnet/wifi-densepose:latest
docker run -p 8080:8080 ruvnet/wifi-densepose
# 打开浏览器仪表盘，连接 ESP32 CSI 采集节点即可看到实时姿态
```

若要在边缘设备部署：把训练好的模型打包成单个 `.rvf` 文件，烧录到 ESP32-S3（内置 AMOLED 屏可直接显示人员状态）。自学习算法 + MicroLoRA 适配让模型自动适配不同户型/WiFi 环境，减少人工校准。注意局限：金属结构会干扰信号、密集人群个体识别率下降、不同环境需重新校准。

**▌ 动手验证**

没有 ESP32 也能先验证 RuView 的流水线是否跑得起来，有硬件则进一步验证端到端感知：

```bash
docker pull ruvnet/wifi-densepose:latest
docker run -p 8080:8080 ruvnet/wifi-densepose
# 浏览器打开 http://localhost:8080 查看 Three.js 仪表盘
```

验证要点（动手检查）：
- 容器启动后打开仪表盘，应能看到 5 个面板中的信号接入与骨架渲染区域（即使无硬件，演示数据也会驱动界面），验证 Rust 处理流水线与前端可运行。
- 若有 ESP32-S3 节点：按官方固件刷写指南烧录后，将节点接入 WiFi，仪表盘应实时出现 17 关键点姿态骨架，验证 CSI→姿态的端到端链路打通。
- 穿墙/生命体征自测：在节点与目标人物间放一堵墙，观察仪表盘是否仍能输出存在热图与呼吸/心率读数，验证无线电穿透能力（对比摄像头方案这点是质的区别）。
- 准确率验证：用官方提供的标注数据集跑推理，应复现出约 94.2% 的姿态估计精度（接近摄像头方案），验证性能数据非虚标。

无硬件也能跑通演示、有硬件能落地感知，两项任一通过即说明 RuView 可实操，而非"只可远观"的论文项目。

**▌ 对比选型表**

| 维度 | RuView | 摄像头姿态 | 毫米波雷达 |
|------|--------|------------|------------|
| 隐私 | 无图像优 | 差 | 中 |
| 穿墙 | 支持 | 不支持 | 部分 |
| 硬件成本 | ~9美元 | 中 | 高 |
| 准确率 | 94.2% | 高 | 中 |
| 适合 | 监护/安防 | 动作捕捉 | 车载 |

**▌ 学习路线**

前置：了解 CSI/信道状态信息基础、Rust 与 Python。入门：跑 Docker 版看演示 CSI 数据；进阶：刷 ESP32 固件组网、读 79 篇 ADR 架构决策记录、用 HuggingFace 预训练模型做二次开发；今日行动：pull 镜像，在浏览器里观察 WiFi 信号如何变成存在热图。

---

🔗 **信息来源**：GitHub 仓库 ruvnet/RuView（⭐ 约 86,389，2026-07-26 周榜）/ chenxutan.com《RuView 深度实战:45K+ Star 的 WiFi 信号人体感知系统》（2026）/ 今日头条《RuView:48k+ Stars 的 WiFi 隔空透视技术,无摄像头的姿态识别神器》

---

### 6. 【croc：一行命令实现端到端加密的跨设备文件传输】（⭐ 38.5k）

> 📍 **导语**：在两台电脑之间传文件，你还在用 U 盘、微信文件助手或临时网盘？schollz/croc 用一行命令就能在任意两台机器间安全地发送文件，靠密码认证密钥协商（PAKE）实现真正的端到端加密，无需注册、无需公网 IP、无需端口转发。它本周 Star 约 38,473（周榜 +2,849），作为老牌但持续上榜的 Go 工具，是"点对点安全传输"里最省心的那一个，本周随 AI 工具链流行再度翻红。

---

**⭐ 项目数据速览**

- **作者 / 语言**：schollz，Go 87%（v10），MIT
- **当前 Star**：约 38,473（本期周榜 +2,849）
- **核心特性**：中继传输、PAKE 端到端加密、跨平台、可续传
- **协议**：IPv6 优先 + IPv4 回退，支持 SOCKS5/Tor 代理
- **中继端口**：默认 TCP 9009–9013
- **安装**：brew/scoop/choco/winget/go install 等十余种方式
- **生态**：F-Droid 第三方 Android 客户端、Docker 镜像

**▌ 它是什么**

croc 是一个命令行文件传输工具，只需 `croc send 文件` 拿到口令短语，另一台机器 `croc 口令` 即可接收。它的独特之处在加密方式：双方用口令短语通过 PAKE（密码认证密钥协商）协商出一把只有彼此知道的密钥，用于端到端加密——意味着连中继服务器都看不到文件内容。它支持任意两台电脑（经中继）、多文件/文件夹、断点续传、stdin/stdout 管道，还能自建中继实现完全自托管。相比电子邮件附件的大小限制、网盘的隐私风险，croc 把"传文件"变成和 `scp` 一样简单、但更不怕网络环境复杂的事。

**▌ 它解决了什么问题**

跨设备传文件的传统路径都有坑：U 盘要物理接触且易丢；即时工具（微信/Slack）有大小限制且内容过云端；scp/rsync 需要双方有可达 IP 和账号。croc 用"中继 + PAKE"绕开所有门槛——发送方和接收方不必在同一局域网、不必有公网 IP，只需都能连到一个中继（默认公共中继，也可自建）。端到端加密保证中继看不到明文，口令短语短而易记。对运维（跨机房传配置）、开发者（本地↔云传日志）、隐私敏感用户（不想文件过第三方云）尤其友好。它还能 `--socks5` 走 Tor，进一步隐藏元数据。值得一提的是 croc 在"中继不可信"假设下依然安全：因为密钥由 PAKE 在两端协商，中继服务器只转发密文，即便被攻陷也还原不出文件内容。这对跨不可信网络（如公共热点、第三方中继）传敏感配置尤为关键。社区还衍生出 F-Droid 上的移动客户端（crocgui / croc-app），让手机和电脑之间也能一行命令互传，彻底摆脱数据线。当然它不适合"海量小文件高频同步"——那种场景 rsync 的增量算法更省带宽；croc 的真正主场是"偶尔一次、要安全、要简单"的点对点传输。

**▌ 原理拆解（含安装/使用步骤）**

```
发送: croc send file → 生成口令短语(code-phrase)
  ↓
PAKE 协商: 双方用口令协商出共享密钥(中继不可见)
  ↓
中继转发: 加密数据经公共/自建中继(9009-9013)
  ↓
接收: croc code-phrase → 端到端解密落盘
```

五分钟上手：

```bash
# 安装(macOS)
brew install croc
# 发送文件/文件夹
croc send ./report.pdf
# 输出: Code is: frosty-river-anguilla
# 另一台机器接收
croc frosty-river-anguilla
# 管道用法：把日志直接流式发出
cat app.log | croc send
croc --yes frosty-river-anguilla > received.log
# 自建中继(完全自托管)
croc relay
croc --relay "myrelay.example.com:9009" send file
```

Linux/macOS 上为避免口令泄露到进程名，建议用环境变量：`CROC_SECRET=xxx croc`。常用选项：`--code` 自定义口令、`--exclude "node_modules,.venv"` 排除目录、`--text "hello"` 发短文本、`--curve p521` 换加密曲线、`--hash imohash` 加速哈希。Docker 自托管中继：`docker run -d -p 9009-9013:9009-9013 -e CROC_PASS='pw' schollz/croc`。

**▌ 动手验证**

用两台机器（或本机开两个终端）亲手验证 croc 的端到端加密传输与续传能力：

```bash
# 机器 A（macOS 示例）
brew install croc
croc send ./report.pdf
# 输出: Code is: frosty-river-anguilla

# 机器 B（或同机另一终端）
croc frosty-river-anguilla
```

验证要点（动手检查）：
- 接收端完整拿到 `report.pdf` 且校验和一致（`shasum report.pdf` 两端相同），验证文件无损送达。
- 加密自测：用 `tcpdump` 或 Wireshark 抓中继 9009 端口流量，应只能看到密文、看不到 `report.pdf` 明文内容，验证 PAKE 端到端加密真实生效（中继不可见明文）。
- 续传自测：传输中途 Ctrl+C 中断，重新 `croc <code>` 应能从中断点继续而非从头开始，验证断点续传。
- 管道自测：`cat app.log | croc send` 与 `croc --yes <code> > received.log` 配对，验证 stdin/stdout 流式传输可用。
- 自建中继自测：`croc relay` 起一个中继，发送方加 `--relay myrelay:9009`，验证可完全自托管、不依赖公共中继。

"明文抓不到 + 续传 + 管道 + 自建中继"任两项通过，即证明 croc 的安全与灵活性是真实能力，而非 README 自夸。

**▌ 对比选型表**

| 维度 | croc | magic-wormhole | rsync |
|------|------|----------------|-------|
| 端到端加密 | PAKE是 | 是 | 隧道依赖 |
| 需公网IP | 否(中继) | 否 | 是 |
| 跨平台 | 强 | 中 | 强 |
| 自建中继 | 支持 | 有限 | 不需 |
| 适合 | 临时安全传 | 临时传 | 增量同步 |

**▌ 学习路线**

前置：会用命令行、理解"端到端加密"基本概念。入门：两台机器间 `croc send`/`croc` 传一次文件；进阶：自建中继 + Docker、用 `--socks5` 走 Tor、写脚本做自动化静默传输（`--quiet`）；今日行动：brew/scoop 装好 croc，给同事发个文件试试"零配置安全传输"。

---

🔗 **信息来源**：GitHub 仓库 schollz/croc（⭐ 约 38,473，MIT，v10.2.7）/ croc 官方 README（Usage / Self-host Relay 章节）/ GitHub Trending 周榜 2026-07-26（blog.csdn.net 转载）
