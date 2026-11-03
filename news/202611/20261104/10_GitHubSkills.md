# GitHubSkills

> 本篇聚焦 2026-10-28 至 2026-11-04 期间 GitHub 上值得开发者关注的六款开源工具与技能项目，覆盖终端编程智能体、智能体技能库、语义代码检索、一体化工程平台、代码库语义搜索与中文 AI 编程方法论六个方向。所有内容均基于公开搜索结果整理，未对已覆盖历史主题重复报道。

---

### 1. 【Qwen Code：通义千问开源、多协议兼容的终端 AI 编程智能体】

> 📍 **导语**
> 在终端里跑一个会读代码、改文件、跑命令的编程智能体，已经成了 2026 年开发者最自然的习惯之一。阿里通义千问团队推出的 Qwen Code 就是这一浪潮里最值得关注的开源选项：它从 Google Gemini CLI 的分支起步，但早已独立演进成支持 OpenAI、Anthropic、Gemini、Qwen 乃至任意第三方或本地模型的多协议智能体框架。对国内开发者而言，它最大的吸引力在于能和开源权重的 Qwen-Coder 系列模型深度对齐，既可以接 DashScope 云端，也可以走 Ollama、vLLM 本地私有化部署，彻底摆脱对单一闭源供应商的绑定。在 SWE-bench Verified 上，七个 Qwen Code 版本配合同一 Qwen 3.7 Max 模型平均拿到 76.40% 到 77.80% 的成绩，说明它不是一个玩具，而是能真正交付工程结果的工具。

**▌ 它是什么？**

Qwen Code 是由阿里通义千问（QwenLM）团队维护、采用 Apache-2.0 许可完全开源的终端 AI 编程智能体，底层用 TypeScript/Node.js 编写，需要 Node.js 22 及以上版本运行。它最初基于 Google Gemini CLI v0.8.2 的分支，但从 v0.1 起就停止同步上游，转而独立发展成一套多协议、多平台的智能体框架。它本质上是一个"住在终端里"的编码助手：能理解大型代码库、自动化繁琐的重构与修复、执行 shell 命令，并和 Qwen 系列代码模型协同演进。项目同时提供桌面端、网页端、IDE 插件（VS Code、Zed、JetBrains）、即时通讯机器人（Telegram、钉钉、微信、飞书）以及供二次开发的 SDK（TypeScript、Python、Java），形态之丰富在开源编程智能体里相当罕见。

**▌ 它解决了什么问题？**

过去两年里，编程智能体大多被锁死在某一家闭源模型或某一个 IDE 生态里：你用 A 家的工具就得用 A 家的模型，想换更强的模型就要换整套工具链，成本与供应商锁定双重压力让很多团队望而却步。更现实的是，国内大量企业有代码不出内网、私有化部署的硬性合规要求，而多数海外编程智能体默认把代码发往云端。Qwen Code 的出现正好切中这两个痛点：它把"智能体框架"和"模型"彻底解耦——你可以用云端 Qwen 模型，也可以用本地 Ollama 拉起的 Qwen3-Coder，还可以随时把后端切到 OpenAI 或 Anthropic 的接口做横向对比。这样一来，开发者既能享受开源权重模型零推理成本的优势，又能在遇到难题时一键切换到更强的付费模型，而不必重写任何工作流。对一个每天要处理几十个仓库的团队来说，这种"模型可插拔、代码可留本地"的灵活性，远比某个单一炫技功能更重要。

**▌ 核心原理三阶拆解**

第一阶是交互入口层。Qwen Code 提供交互式终端界面、无界面（headless）批处理模式、IDE 插件、桌面应用和守护进程（daemon）五种形态。守护进程模式通过 HTTP 加 SSE 以 ACP 协议对外暴露同一个共享智能体会话，允许多个客户端同时附着；即时通讯模式则把智能体变成群里一个会干活的机器人。

第二阶是智能体能力层。它内置子智能体（SubAgents）、智能体团队、动态工作流、自动记忆、自动技能、钩子（Hooks）、计划模式、LSP 集成、沙箱、Git 工作树（worktree）和计算机使用（Computer Use）等能力，几乎和 Claude Code 做了功能对齐，还额外多出 Agent Arena（同一任务多模型对打）等多协议特性。

第三阶是模型与工具编排层。所有工具调用和代码编辑都通过统一的 Agent 循环驱动，模型按工具返回的结果决定下一步动作，直到任务完成；MCP 作为一等公民被原生支持，外部 MCP 服务器以"工具提供者"身份与内置能力并列加载，使智能体可以无限扩展出新的外部能力。

**▌ 动手验证**

```bash
# 1. 全局安装（也可从源码构建）
npm install -g @qwenlm/qwen-code
# 2. 配置密钥：云端走 DashScope，或指向本地推理
export DASHSCOPE_API_KEY="你的密钥"
# 本地模型示例：让请求走 Ollama
export OPENAI_BASE_URL="http://localhost:8000/v1"
# 3. 在项目目录里启动交互会话
qwen
# 4. 无界面模式跑一次性任务，适合 CI/CD 与脚本
qwen -p "解释一下项目的鉴权流程并补一份单元测试"
# 5. 接 MCP 服务器（在 ~/.qwen/settings.json 写入 mcpServers 即可）
```

**▌ 对比与选型**

| 维度 | Qwen Code | Claude Code | Gemini CLI |
|------|-----------|-------------|------------|
| 开源许可 | Apache-2.0 | 闭源 | 开源 |
| 模型协议 | 多协议可插拔 | 单一厂商 | 偏 Gemini |
| 本地部署 | 支持 Ollama/vLLM | 不支持 | 有限 |
| 适用人群 | 终端党/私有化 | 闭源生态用户 | Google 生态 |

选型建议：如果你重视开源透明、模型可替换、代码可留本地，Qwen Code 是当前最省心的入口；若你已深度绑定某闭源生态则不必强迁。

🔗 **信息来源：** GitHub 仓库 QwenLM/qwen-code（2026-11 更新） / qwen.ai 官方文档 Qwen Code 页 / awesome-mcp.korchasa.dev 项目解析页

---

### 2. 【Agentic Awesome Skills：给 Claude Code 与 Codex 装上 2700+ 可审查技能的控制平面】

> 📍 **导语**
> 当编程智能体越来越普及，"会不会用技能（Skill）"成了效率分水岭。可是技能散落在各处、良莠不齐，装多了还会撑爆上下文。sickn33 维护的 Agentic Awesome Skills（简称 AAS）用一种很聪明的方式解决了这个问题：它先攒起一个超过 2700 份 SKILL.md 玩法的本地大目录，再配一个名为 AAS Core 的只读 MCP 控制平面——让你的智能体自己翻目录、自己挑技能，而工具只负责在校验内存里确认这些选择合法，并生成一份你审阅后才落地的计划。截至 2026 年 11 月初，项目在 GitHub 上约有 4.9 万颗星、本周新增约 483 颗，是当下最热门的智能体技能聚合项目之一。

**▌ 它是什么？**

Agentic Awesome Skills 是一个基于开放 Agent Skills 标准构建的开源项目，采用 MIT 许可，用 Python 编写。它的核心由两大部分组成：其一是汇聚了 2700 多份可安装 SKILL.md 玩法的本地目录，覆盖开发、测试、安全、基础设施、产品等多个方向；其二是 AAS Core——一个本地优先、只读的控制平面，以一个本地 MCP 服务器加命令行工具的形式，让 Claude Code、Codex、Cursor、Gemini CLI、Kiro、Copilot、OpenCode 等几十种编程智能体能够检索目录、管理技能选择、校验清单并预览执行计划。它的理念很明确：让智能体而不是工具去决定需要哪些技能，但所有决定都必须在人类审阅之后才能落到磁盘上。

**▌ 它解决了什么问题？**

智能体技能生态现在最大的矛盾是"选择"与"信任"。一方面，社区里冒出了成千上万个零散的技能文件，开发者根本无从逐一评估；另一方面，很多工具会一股脑把所有技能塞进上下文，结果智能体还没干活就被无关指令淹没，甚至误用带有攻击性的技能。AAS 的巧妙之处在于它刻意不做"排名与推荐"：Core 组件明确不替你打分，只提供一个只读的 compose_stack 工具在内存里校验所选技能编号与结构是否合法，再用 aas stack validate 和 aas stack plan 产出一份不可篡改的计划，把每一步都交还给人类审查。这样既保留了"智能体自主挑技能"的灵活，又用只读 MCP 和命令行预演把风险关进了笼子。对团队而言，最终选定的技能栈还能被固定进 aas-stack.json，方便复用与审计，相当于给智能体的"超能力清单"上了版本管理。

**▌ 核心原理三阶拆解**

第一阶是目录层。所有技能以规范化的 SKILL.md 形式存放在 skills/ 目录下，按 brainstorming、web 开发、安全、运维、文档等类目组织，支持嵌套子技能；每一份都附带来源标注与许可信息，保证可追溯。

第二阶是选择与校验层。智能体通过 search_skills、get_skill、list_skill_files 等只读工具浏览完整本地目录，挑出所需技能编号；AAS Core 的 compose_stack 在内存中校验这些编号与结构，从不做任何未经审查的推荐或执行。

第三阶是计划与分发层。校验通过后生成 aas-stack.json 清单与不可变计划，开发者可在浏览器本地的 Workbench 里逐项查看；确认无误后再通过 npx 一键安装，或直接以插件包、角色化技能包形式分发到对应智能体。

**▌ 动手验证**

```bash
# 1. 用 npx 试运行（dry-run 不落盘，只看会被装哪些技能）
npx agentic-awesome-skills --skills brainstorming,systematic-debugging --dry-run
# 2. 审查无误后去掉 --dry-run 真正安装
npx agentic-awesome-skills --skills brainstorming,systematic-debugging
# 3. 给 Codex / Claude 配置 AAS Core MCP，让智能体自己挑技能
# 在 MCP 配置里指向本地 AAS Core 服务，agent 即可调用 search/compose
# 4. 校验与预览
aas stack validate
aas stack plan
```

**▌ 对比与选型**

| 维度 | AAS | 手写单技能 | 市场直装 |
|------|-----|------------|----------|
| 技能数量 | 2700+ | 1 | 不定 |
| 选择主体 | 智能体自选 | 人肉挑 | 市场推 |
| 审查机制 | 只读+计划 | 无 | 弱 |
| 可追溯性 | aas-stack.json | 差 | 差 |

选型建议：若你希望技能"可挑选、可审查、可复用"，AAS 是当下最规整的方案；但注意它刻意不做编辑性筛选，install 前务必用审计与 dry-run。

🔗 **信息来源：** GitHub 仓库 sickn33/agentic-awesome-skills（2026-11-03 更新） / vibecodes.net 技能解析页 / zendot.org AAS Core 评测文章

---

### 3. 【Serena：用符号级语义检索把 LLM 变成"会读 IDE"的编程伙伴】

> 📍 **导语**
> 传统编程智能体改代码，靠的是把整文件读进来再拿字符串替换去改；文件一大、引用一多，引号错配、行号偏移、漏改调用点就成了家常便饭。由 Oraios AI 开源的 Serena 走了一条不同的路：它不是一个智能体，而是一个给智能体用的 MCP 工具包，基于语言服务器协议（LSP）让 AI 像资深工程师用 IDE 那样"按符号"理解代码——找定义、查引用、跨文件安全重命名、替换函数主体。它支持 40 多种编程语言，响应时间低于 200 毫秒，被官方推荐为"AI 智能体要在真实生产代码库上可靠工作时的首选 MCP 工具包"。截至 2026 年，它在 GitHub 上获得约 2.8 万到 3.1 万颗星。

**▌ 它是什么？**

Serena 是一个开源的 MCP（模型上下文协议）服务器，采用 MIT 许可，核心用 Python 实现，需要 Python 3.11 以上以及对应语言的 LSP 语言服务器。它把 IDE 级别的语义代码检索、编辑、重构与调试能力，以"符号（Symbol）"为粒度暴露给任意兼容 MCP 的 AI 客户端，包括 Claude Code、Codex、Cursor、VS Code、JetBrains AI Assistant 等。与基于行号或正则的粗糙方式不同，Serena 在符号层面理解代码结构：类、函数、变量、接口实现、类型层级都是一等公民。它提供 find_symbol、find_references、rename、replace_symbol_body、cross-file move 等原子化工具，让智能体用极少的 token 完成精准改动。

**▌ 它解决了什么问题？**

在大中型代码库里，编程智能体最怕两件事：一是"找不到"，grep 一种类名可能返回几十个同名结果，智能体要在海量文本里自己判断哪个才是目标；二是"改不对"，纯字符串替换一旦遇上重载、继承、跨文件引用就会翻车，漏改一个调用点就是线上 bug。Serena 把这两件事交还给专业的语言服务器：它知道某个符号的所有引用点、知道重命名时要同步更新哪些文件、知道删除前先检查有没有依赖。官方对比显示，找一个类从 grep 多步手工缩窄，变成一次 find_symbol 直达；跨文件重命名从七步手工替换，变成 rename_symbol 一步完成。对 monorepo 或多语言项目维护者而言，这意味着更少的上下文消耗、更低的出错率，以及更可信的自动化重构。

**▌ 核心原理三阶拆解**

第一阶是索引与语言服务层。Serena 启动后通过 multilspy 或 JetBrains 后端连接对应语言的 LSP 服务器（如 pylsp、typescript-language-server、gopls），由语言服务器真正解析抽象语法树与引用关系，Serena 只负责调度。

第二阶是符号操作层。它把语言服务器能力封装成符号级工具：检索类定义与概览、列出全部引用、查询接口实现、做类型层级分析；编辑侧则提供安全重命名、替换符号主体、在符号前后插入、安全删除（先查依赖再删）等原子操作。

第三阶是 MCP 接入层。所有能力通过标准 MCP 协议暴露，客户端以启动命令方式运行 Serena 并传入 project_path，智能体 thereafter 自动调用这些工具而非读取整文件，从而大幅压缩 token 占用。

**▌ 动手验证**

```bash
# 1. 推荐用 uvx 安装最新版（避免市场里的陈旧命令）
uvx serena@latest
# 2. 为项目主语言安装语言服务器，例如 Python / TypeScript
pip install python-lsp-server
npm install -g typescript-language-server typescript
# 3. 在 MCP 客户端配置里挂载 Serena，并指定要分析的项目目录
# claude_desktop_config.json 中加入：
# { "mcpServers": { "serena": {
#   "command": "npx", "args": ["-y","serena","--project-path","/path/to/project"] } } }
# 4. 重启客户端后，让智能体用 find_symbol / rename_symbol 做语义操作
```

**▌ 对比与选型**

| 维度 | Serena | 纯文本 grep | 整文件读取 |
|------|--------|-------------|------------|
| 理解粒度 | 符号级 | 文本级 | 全文 |
| 跨文件重命名 | 一步 | 多步手工 | 易漏 |
| Token 消耗 | 低 | 中 | 高 |
| 语言覆盖 | 40+ | 不限 | 不限 |

选型建议：中大型、多语言、跨文件引用密集的仓库，Serena 价值最高；一次性脚本或小仓库，装语言服务器的成本可能不划算。

🔗 **信息来源：** GitHub 仓库 oraios/serena（MIT 许可） / aiproducthub.cn Serena 介绍页 / mcpgee.com 服务器目录页

---

### 4. 【Kilo Code：覆盖 IDE、CLI 与云端的全场景开源智能体工程平台】

> 📍 **导语**
> 很多编程智能体要么只活在某个 IDE 里，要么只在终端里好用，换一个工作场景就得换工具。Kilo Code 想做的正好相反——它把自己定位成"一体化智能体工程平台"，同一套开源智能体可以跑在 VS Code、JetBrains、命令行，也可以搬到云端做代码审查。它最打动人的是定价哲学：接入 500 多款模型、自带网关零加价，你用哪家的模型就按哪家费率付费，支持自带密钥与本地模型，绝不暗中切换模型。项目在 GitHub 上约有 2.78 万颗星、3000 多 fork，官方称已有 300 多万名 Kilo 开发者、处理了超过 40T 的 token。

**▌ 它是什么？**

Kilo Code 是由 Kilo-Org 维护、采用 Apache-2.0 许可开源的 AI 编程智能体，底层用 TypeScript/bun 构建，可安装为 VS Code 扩展、JetBrains 插件或通过 npm/curl/Homebrew 装的命令行工具。它的核心卖点是"一个智能体，无处不在"：开发者在 VS Code 里写代码、在 JetBrains 里调试、在 CLI 里批处理、在云端做自动审查，用的都是同一个开源智能体。它内置多种工作模式——Code 模式负责写与重构、Architect 模式在动手前先给结构化方案、Debug 模式读错误追根因、还有 Ask 与自定义模式。项目还提供 Cloud Agent 与代码审查服务，让本地编码和远程智能体评审可以在不换工具的前提下衔接。

**▌ 它解决了什么问题？**

开发者面对的真实困境往往是"工具碎片化"：在 IDE 里用 A、在终端里用 B、在 CI 里又得换 C，模型供应商也被各家锁定，想比价或换更强模型就要推倒重来。Kilo Code 用两条设计直接回应：一是"全场景同一智能体"，无论你在哪个界面，行为和配置一致，工作可以无缝交接；二是"零加价网关"，它通过 Kilo Gateway 统一路由 500 多款模型，按供应商原价计费、不赚差价，还提供 Auto Model 按会话自动分类选路以控制开销。对预算敏感又不想被绑死的个人或团队，这意味着既能用上 GPT-6 Astra、Claude Fable、Gemini、Grok、DeepSeek 等前沿模型，又能在免费或本地模型上把成本压到接近零。再加上它完全开源、可审计提示词与上下文窗口，避免了"黑箱切换模型"的信任隐患。

**▌ 核心原理三阶拆解**

第一阶是统一智能体内核。Kilo Code 把编码智能体的核心逻辑抽象成与界面无关的运行单元，使其能在 VS Code、JetBrains、CLI、Cloud 四种形态下复用同一套代理循环与工具集。

第二阶是模型网关层。Kilo Gateway 作为中间层对接 500 多款模型，Auto Model 根据会话类型动态路由到 Efficient、Frontier、Balanced 或 Free 策略，开发者也可显式指定；网关承诺零加价、不静默换模型，所有路由决策可审计。

第三阶是协作与运维层。平台提供 Agent Command Center 统一管控分散在各处的智能体，支持并行隔离的工作树、本地与云端智能体切换，并通过 KiloClaw 把常驻 OpenClaw 智能体托管到云端，连接 Telegram、Discord、Slack 做定时任务。

**▌ 动手验证**

```bash
# 1. 命令行安装（任选其一）
npm install -g @kilocode/cli
curl -fsSL https://kilo.ai/cli/install | bash
# 2. 进入任意项目目录启动
kilo
# 3. VS Code / JetBrains 用户直接装扩展或插件，登录后即用 500+ 模型
# 4. 想做云端自动代码审查，到 app.kilo.ai/code-reviews 开启 Pull Request 评审
```

**▌ 对比与选型**

| 维度 | Kilo Code | Cursor | 纯 CLI 智能体 |
|------|-----------|--------|---------------|
| 运行形态 | IDE+CLI+云 | IDE 为主 | 终端为主 |
| 模型加价 | 零加价 | 有订阅 | 自付 |
| 开源程度 | Apache-2.0 | 闭源 | 视项目 |
| 云端评审 | 内置 | 弱 | 无 |

选型建议：想要"一个智能体打通所有工作界面、且模型不绑死"的团队，Kilo Code 是当前形态最完整的开源选择。

🔗 **信息来源：** GitHub 仓库 Kilo-Org/kilocode（2026-11-02 更新，27.8k stars） / kilo.ai 官方网站 / GitHub 仓库 README 安装说明

---

### 5. 【Claude Context：把整个代码库变成任意编程智能体可语义搜索的上下文】

> 📍 **导语**
> 编程智能体最尴尬的短板，是它其实"看不见"你的代码：Claude Code、Gemini CLI 这类工具在面对真实代码库时，往往要一轮轮地翻目录、读文件才能拼出上下文，既慢又烧 token。Zilliz 开源的 Claude Context（早期叫 Code Context）用一个 MCP 插件把这件事彻底改写了——它先把你的代码库切片、嵌入、存进向量数据库，再用语义搜索让智能体一次就拿到"相关代码"，百万行级别也不在话下。项目在 GitHub 上约有 1.26 万颗星，并被官方定位为"给 Claude Code 补上语义代码搜索"的基础设施。

**▌ 它是什么？**

Claude Context 是一个开源的 MCP 插件，采用 MIT 许可，以 monorepo 形式包含三个核心包：claude-context-core（负责索引、嵌入与向量库集成的核心引擎）、VSCode 扩展（在 IDE 内提供语义搜索界面）以及 claude-context-mcp（面向 AI 智能体的 MCP 服务器）。它的目标是"把整个代码库变成智能体的上下文"：通过语义搜索，智能体无需多轮试探就能直接找到与问题相关的代码，并把这些结果送进上下文窗口。它原生支持 Claude Code，也提供对 OpenAI Codex CLI、Gemini CLI、Qwen Code、Cursor 等客户端的配置示例，是一个典型的"模型无关、客户端无关"的基础设施。

**▌ 它解决了什么问题？**

大模型编程助手常犯的错，是"没看到关键代码就瞎改"。传统做法为了让智能体了解仓库，要么把整个目录灌进上下文（对大仓库极其昂贵），要么让智能体自己一轮轮 grep、读文件去摸索（又慢又容易遗漏）。Claude Context 用向量检索切断了这个两难：它先把代码按 AST（抽象语法树）分块，用 OpenAI、VoyageAI、Ollama 或 Gemini 的嵌入模型转成向量，存进 Milvus 或 Zilliz Cloud；智能体提问时，语义搜索直接召回最相关的若干代码块，而非把整库塞满上下文。官方强调，对大型代码库而言，这比每次请求都加载整个目录便宜得多，也避免了多轮发现（multi-round discovery）的延迟。对动辄百万行的单体仓库来说，这等于给智能体装了一本"带索引的说明书"。

**▌ 核心原理三阶拆解**

第一阶是索引层。Claude Context 用基于 AST 的分块器（带自动回退）把代码切成语义完整的片段，支持 TypeScript、Python、Java、Go、Rust、C++ 等十余种语言，再用嵌入模型把这些片段向量化。

第二阶是存储层。向量被写入 Milvus 或全托管的 Zilliz Cloud，构成可缩放的代码语义索引；配置上需要一份 Zilliz Cloud 的免费向量库密钥与一份用于嵌入的 OpenAI 密钥（也支持本地 Ollama 嵌入以去云端依赖）。

第三阶是检索与接入层。MCP 服务器暴露语义搜索工具，智能体通过 claude mcp add 或对应客户端的配置文件挂载后，即可用自然语言查询"这个函数在哪里被调用""某功能如何实现"，结果直送上下文，无需读整库。

**▌ 动手验证**

```bash
# 1. 准备：Zilliz Cloud 免费向量库密钥 + OpenAI 嵌入密钥
# 2. 给 Claude Code 挂上 MCP（Node >= 20）
claude mcp add claude-context \
  -e OPENAI_API_KEY=sk-你的密钥 \
  -e MILVUS_ADDRESS=你的公有云端点 \
  -e MILVUS_TOKEN=你的zilliz密钥 \
  -- npx @zilliz/claude-context-mcp@latest
# 3. 校验挂载
claude mcp list
# 4. 在 Qwen Code / Gemini CLI / Cursor 中写入对应 settings.json 的 mcpServers 亦可
```

**▌ 对比与选型**

| 维度 | Claude Context | 全目录灌入 | 手工 grep |
|------|---------------|------------|-----------|
| 检索方式 | 语义向量 | 全文 | 文本正则 |
| 大库成本 | 低 | 极高 | 中 |
| 多轮摸索 | 不需要 | 不需要 | 需要 |
| 依赖 | 向量库+嵌入 | 无 | 无 |

选型建议：代码库规模大、跨文件语义查找频繁的场景，Claude Context 能显著降成本；小项目或纯离线无向量库环境则收益有限。

🔗 **信息来源：** GitHub 仓库 zilliztech/claude-context（2026-11 更新，12.6k stars） / zilliz.com 官方博客与 MCP 术语页 / zilliz.com.cn 中文实操教程

---

### 6. 【superpowers-zh：把 20 个 AI 编程实战方法论汉化并加中国原创技能的开发者超能力包】

> 📍 **导语**
> 英文社区里 superpowers 是当下最火的 AI 编程技能框架之一，星数早过二十万，但它面向的是英文工作流，国内开发者用起来总有"机翻味"和"装不对工具"的别扭。jnMetaCode 维护的 superpowers-zh 干脆做了一次彻底的中文增强：把上游 14 个技能完整汉化，再叠加 6 个面向中国开发者的原创技能，并用一个 npx 命令自动识别项目里用的是哪款 AI 编程工具来安装。项目在 GitHub 上约有 8400 多颗星，支持从 Claude Code、Cursor 到通义 Qwen Code、腾讯 CodeBuddy、华为 CodeArts 等二十多款工具，是中文 AI 编程方法论落地最顺手的一站式入口。

**▌ 它是什么？**

superpowers-zh 是 superpowers 的中文社区增强版，采用 MIT 许可，主体以 JavaScript 编写。它把上游最流行的 AI 编程技能方法论做了逐节汉化（技术术语保留英文），并额外贡献了 6 个中国原创技能，合计约 20 到 21 个技能，覆盖从头脑风暴、系统化调试、接收代码审查到完成前验证的完整工作流。它的差异化不只是翻译：一是安装极简，一条 npx superpowers-zh 就能自动探测项目所用工具并装好对应技能包，探测失败还可加 --tool 显式指定；二是本土适配，补上了 Gitee、Coding、极狐 GitLab、CNB 等国内代码平台支持，给出 Gitee Go、Coding CI、极狐 CI 与 .cnb.yml 等 CI/CD 示例，并把代码审查风格调成契合国内团队沟通习惯的语气，加上中文 Conventional Commits 规范与中文排版规则；三是额外提供 mcp-builder 与 workflow-runner 两个独立技能，分别用于构建 MCP 服务器与多角色 YAML 编排。

**▌ 它解决了什么问题？**

中文开发者用海外技能包时，常踩两个坑：第一是"装不上"，上游按工具分别给插件市场命令，一个团队里有人用 Cursor、有人用 Claude Code、还有人用 Qwen Code，命令各不相同、没人记得自己跑的是哪一版；第二是"用不顺"，英文提示词写出来的提交信息、审查评论带着西方直接风格，和国内团队的沟通文化对不上，中文文档规范也缺失。superpowers-zh 用一个统一的 npx 安装器把"按工具分装"收敛成"自动识别安装"，又把国内代码平台、CI 流水线、提交与审查规范一次性补齐，让方法论真正能落地到中文工作流里。它还通过"翻译增量显式标注 + 构建审计"的机制保证汉化文件和上游不悄悄分叉：翻译内容只有两处被明确标注为增量，其余逐节对应，一旦混进未标记的改动构建就会失败——这对需要长期跟随上游的团队是关键的信任保障。

**▌ 核心原理三阶拆解**

第一阶是技能内容层。14 个上游技能被逐节汉化，6 个中国原创技能（国内代码平台、CI/CD 示例、中文审查风格、中文提交规范、mcp-builder、workflow-runner）由本仓库独立拥有，构成真正差异化的部分。

第二阶是安装与路由层。npx superpowers-zh 命令扫描项目环境，识别当前存在的 AI 编程工具，自动选用匹配的技能包安装；翻译内容里的"中国特色技能路由"段负责把不同工具的加载方式统一起来。

第三阶是同步与审计层。项目跟踪上游版本并在其上叠加中国特有内容，翻译部分通过构建期审计强制要求增量显式标注，保证升级上游新版本时汉化文件不会无声偏离。

**▌ 动手验证**

```bash
# 1. 一条命令自动识别并安装（支持 Claude Code / Cursor / Qwen Code 等）
npx superpowers-zh
# 2. 若自动探测失败，显式指定目标工具
npx superpowers-zh --tool claude-code
# 3. 装好后，在智能体里用 brainstorming 先澄清需求，再进入 writing-plans
# 4. 用 receiving-code-review / verification-before-completion 收尾，避免"直接开写"
```

**▌ 对比与选型**

| 维度 | superpowers-zh | 英文上游 | 自写提示词 |
|------|----------------|----------|------------|
| 语言 | 中文 | 英文 | 自己维护 |
| 支持工具 | 20+ 款 | 6 款 | 单工具 |
| 本土适配 | 有 | 无 | 视情况 |
| 安装方式 | 一条 npx | 分工具装 | 手工 |

选型建议：中文团队、用多款国产/海外 AI 编程工具混搭的，superpowers-zh 能明显省去"装不对、用不顺"的摩擦；纯英文单工具工作流则上游已够用。

🔗 **信息来源：** GitHub 仓库 jnMetaCode/superpowers-zh（2026-11 更新，约 8.4k stars） / ossaihub.com 项目介绍页 / alixixi.com 中文对比解析
