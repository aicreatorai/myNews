# 10_GitHubSkills（2026-08-03）

> 模块定位：聚焦 GitHub 上值得关注的开源 AI 编程与智能体工具，每条给出价值、原理、上手与选型对比。
> 本期 6 条均经去重检测（check-dedup 返回 🟢），且为模块 10 近 5 天未覆盖项目。

---

### 1. 【Continue：可接入本地模型、完全自托管的开源 VS Code AI 扩展】（⭐ 约 35k Star）

> 📍 **导语**：当 GitHub Copilot 把你的代码发往云端、Cursor 又闭源收费时，Continue 给开发者留了一条完全自主的路——它是一款 Apache 2.0 许可的开源 AI 编程扩展，装进 VS Code 或 JetBrains 后，你可以接任何模型：Claude、GPT、Gemini，也可以接本地 Ollama 模型做到零数据出网。截至 2026 年，其 GitHub Star 已突破 3.5 万，被多家评测列为"最佳开源 AI 编程扩展"。在模型厂商频繁调价、数据合规要求趋严的 2026 年，Continue 这种"自带密钥、自己选模型、代码不出本机"的形态，正从极客玩具变成团队可落地的默认选项。

**▌ 它是什么？**
Continue（github.com/continuedev/continue）是一个面向 VS Code 与 JetBrains 的开源 AI 编程助手，采用 Apache 2.0 许可。它在编辑器内提供四类核心能力：Chat（对话问答、解释代码、生成测试）、Autocomplete（随打随出的行内补全幽灵文本）、Edit（选中代码用自然语言改写）、Agent（跨多文件的大规模改动）。与闭源竞品最大的不同是"模型完全可控"——通过一份 `~/.continue/config.json`，你可以把 chat、edit、tab 补全分别指向不同供应商，甚至把补全交给本地 Codestral、把复杂推理交给云端 Claude。社区还支持自定义 slash 命令（如 `/test`、`/doc`）与项目级规则文件（`.continue/rules/`），把团队编码规范固化进每次提示词。

**▌ 它解决了什么问题？**
传统闭源 AI 编程助手有三道隐形墙。第一是供应商锁定：Copilot 只能用微软管理的模型，Cursor 把模型与编辑器绑定，你想换模型就得换工具。第二是隐私与合规：企业代码、医疗与金融数据往往不允许离开内网，而云端助手的推理链路默认把上下文发往第三方服务器。第三是成本不透明：闭源产品的订阅费固定，但 token 消耗随任务剧烈波动。Continue 用"开源 + BYOK（自带密钥）+ 本地模型"三件套一次性拆掉这三道墙——代码上下文若走 Ollama，则完全在本地 GPU/CPU 上推理，零数据出网；若走云端，你直接付模型厂商的原价，不被二次加价；模型选择自由，可针对"简单补全"与"复杂重构"切到不同档位的模型，把成本压到最低。

**▌ 核心原理拆解**
Continue 的架构本质上是"配置驱动的模型路由 + 本地代码索引"。安装后，所有行为都由 `config.json` 描述：
```
config.json
  ├─ models[]        # 声明 chat/edit 用哪个 provider、哪个 model
  ├─ tabAutocompleteModel  # 指定 FIM（填充中间）模型做行内补全
  ├─ contextProviders[]    # codebase / file / terminal 等上下文源
  └─ rulesDir        # 项目级规则自动注入提示词
        ↓
编辑器内事件（输入、选中、保存）
  ↓
Context Provider 用本地嵌入索引抓取相关代码块（@codebase）
  ↓
按 config 把请求发给对应 LLM（云端 API 或本地 Ollama）
  ↓
流式返回 → 行内补全 / 对话 / Agent 多文件编辑
```
关键点有三：一是 tab 补全走专门的 FIM 模型（如 StarCoder2、Codestral），比用通用对话模型补全更快更准；二是 codebase 上下文靠本地 embedding 索引实现"语义级"引用，而非简单粘贴当前文件；三是 Agent 模式可读取整个项目、规划跨文件改动并迭代，直至任务通过。

**▌ 动手验证**
```bash
# 1. 在 VS Code 中安装（或 JetBrains 市场搜 Continue）
code --install-extension continue.continue

# 2. 准备本地模型（完全离线方案）
ollama pull qwen2.5-coder:7b      # 补全用 FIM 模型
ollama pull qwen3.5:9b            # 对话/推理用

# 3. 编辑 ~/.continue/config.json
{
  "models": [{ "provider": "ollama", "model": "qwen3.5:9b", "title": "Qwen 本地" }],
  "tabAutocompleteModel": { "provider": "ollama", "model": "qwen2.5-coder:7b" },
  "contextProviders": [{ "name": "codebase" }, { "name": "file" }]
}

# 4. 打开任意代码文件，Ctrl+L 唤起对话，输入"为这个函数写单元测试"
```
验证标准：出现本地模型的补全幽灵文本、对话能引用项目内其他文件、且不产生任何外部 API 调用（可断网测试）。

**▌ 对比与选型**
| 对比维度 | Continue | Cursor | GitHub Copilot | Cline |
|---------|--------|-------|---------------|-------|
| GitHub Star | ~35k | 闭源无 | 闭源无 | ~59k |
| 开源协议 | Apache 2.0 | 闭源 | 闭源 | Apache 2.0 |
| 本地模型 | ✅ Ollama | ❌ | ❌ | ✅ |
| 模型自选 | ✅ 任意 | 多模型 | 受限 | ✅ 311+ |
| 价格 | 免费(BYOK) | $20/月 | $10/月起 | 免费(BYOK) |
| 适合场景 | 隐私/自选模型 | 最佳 IDE 体验 | 企业合规 | 编辑器内智能体 |

选型建议：重视数据不出网与模型自由选 → Continue；只在 VS Code 内要智能体且接受闭源 → Cursor；团队已在 GitHub 生态且要合同级合规 → Copilot。

🔗 **信息来源：** yuzec.com/tools/continue（2026，35k+ Star）/ aimadetools.com/blog/continue-dev-complete-guide（2026，开源 VS Code 助手指南）/ topcodetools.com/blog/best-ai-extensions-for-vscode（2026，VS Code AI 扩展评测）

---

### 2. 【SWE-agent：让语言模型自主修复 GitHub Issue 的开源智能体框架】（⭐ 约 20k Star）

> 📍 **导语**：SWE-agent 由普林斯顿与斯坦福的研究者打造，是首个在 SWE-bench 基准上取得开源 SOTA 的"软件工程智能体"——它读入一个 GitHub Issue，自己探索代码库、改文件、跑测试、提交 PR。截至 2026 年 7 月，主仓库 Star 约 2 万，团队已把重心迁到更简单的 Mini-SWE-Agent（约 6.1k Star、100 行 Python 即达 SWE-bench Verified 65%）。对想理解"自主修 Issue"到底怎么实现的开发者与研究者，这是最透明、可审计、可 hack 的开源范本。

**▌ 它是什么？**
SWE-agent（github.com/SWE-agent/SWE-agent）是一个 Python 编写、MIT 许可的研究型框架，把任意 LLM（GPT-4o、Claude Sonnet 4、或本地模型）变成能操作真实仓库的软件工程智能体。它最著名的贡献是提出了 Agent-Computer Interface（ACI，智能体-计算机接口）：不给模型一堆杂乱工具，而是设计一组结构化、可验证的接口（浏览、搜索、编辑、执行），让模型以最小认知负担与代码库交互。整个智能体行为由单个 YAML 配置驱动，支持函数调用、多模态输入（图片 Issue）、自定义工具，以及 GitHub/Slack 集成。它是 NeurIPS 2024 论文的官方实现，学术可信度高于多数闭源产品。

**▌ 它解决了什么问题？**
真实项目里的 bug 修复是个"长链路"任务：先读 Issue，再在全仓定位相关文件，改好几处代码，跑测试验证，最后开 PR。人类工程师做这事靠经验与上下文记忆，而通用聊天机器人只能一次改一个文件、看不到全貌。SWE-agent 把这条链路封装成一个可复现的实验流程：你给它一个 Issue 编号，它输出一个通过测试的 PR。对维护者而言，它把"低复杂度 bug 的 triage 与修复"从几天压到几小时；对研究者而言，它提供了在 SWE-bench 上公平比较不同模型（Claude vs GPT-4o）的标准化环境；对安全研究者，它的 EnIGMA 模式还能自主发现并利用漏洞，用于 CTF 与攻防研究。对开源维护者而言，深夜收到的低优先级 bug 往往积压数月；把这类清晰、可验证的 Issue 交给 SWE-agent，既能保持仓库活跃度，又不必占用核心贡献者的精力。对企业内部的私有仓库，它同样可作为"初稿生成器"——先由智能体产出可运行补丁，再由人类工程师做最终把关，形成人机分工的闭环，把专家从重复劳动里解放出来。

**▌ 核心原理拆解**
SWE-agent 的核心是把"修 Issue"建模成"智能体在受控环境里循环执行动作"：
```
输入: GitHub Issue 文本（+ 可选图片）
  ↓
ACI 初始化: 克隆仓库、建立文件/搜索/执行接口
  ↓
循环:
  1. 模型读取 Issue + 当前上下文 → 选择一个 ACI 动作
  2. 执行器运行该动作（编辑文件 / grep / 跑 pytest）
  3. 把结果（diff、测试输出）回灌给模型
  ↓
终止条件: 测试通过 或 达到步数上限
  ↓
输出: 一个待评审的 Pull Request（含 commit 与说明）
```
关键设计是 ACI 而非裸工具调用——它限制动作空间、规范输出格式，使模型的"决策"更稳、轨迹更可审计；单个 YAML 配置让实验可复现，方便换模型、换提示词做消融。

**▌ 动手验证**
```bash
# 1. 克隆并安装
git clone https://github.com/SWE-agent/SWE-agent.git
cd SWE-agent && pip install -e ".[all]"

# 2. 配置 LLM（以 Anthropic 为例）
export ANTHROPIC_API_KEY=sk-...

# 3. 跑一个官方示例 Issue
python -m sweagent run \
  --model claude-sonnet-4 \
  --instance ghusr__<repo>-<issue_id> \
  --config config/default.yaml

# 4. 查看生成的 PR 草稿与轨迹日志
```
注意：运行会消耗 API token（单 Issue 约 $1–$10），务必在沙箱或临时分支中运行，生成的 PR 必须人工评审后再合并。新用户建议直接试 Mini-SWE-Agent（100 行版本）理解原理。

**▌ 对比与选型**
| 对比维度 | SWE-agent | Devin(商业) | OpenHands | Cline |
|---------|----------|------------|----------|-------|
| GitHub Star | ~20k | 闭源无 | ~68k | ~59k |
| 许可 | MIT | 商业闭源 | MIT | Apache 2.0 |
| 定位 | 研究/基准 | 产品化 | 平台 | 编辑器智能体 |
| 交互面 | CLI/YAML | 托管平台 | Web/终端 | VS Code |
| 适合谁 | 研究者/审计 | 企业交付 | 团队自托管 | 个人开发 |

选型建议：做基准研究、教学或安全审计 → SWE-agent；要开箱即用的商业交付 → Devin；要带沙箱与多智能体的自托管平台 → OpenHands。

🔗 **信息来源：** github.com/SWE-agent（2026-07-27 更新，主仓约 20k Star）/ ossaihub.com/tool/swe-agent-princeton-nlp（2026-07，19,906 Star、Mini-SWE-Agent 65% 进展）/ theaiagentindex.com/agents/swe-agent（2026，19.4k Star、MIT、BYOK 评测）

---

### 3. 【Composio：为 AI 智能体提供上千种工具集成的开源中间件】（⭐ 约 29k Star）

> 📍 **导语**：大模型决定了智能体"会不会想"，Composio 解决的是"怎么动手"——它是面向 AI Agent 的工具接入与认证基础设施，用 Python/TypeScript SDK 把 GitHub、Slack、Salesforce、Gmail、Linear、Notion 等上千个 SaaS 的调用、鉴权、触发器统一封装。2026 年其 Star 约 2.9 万，工具数从年初约 250 个扩展到 1000+，并推出 MCP Gateway 让 Claude、Cursor、Codex 等智能体通过单一标准端点调用工具。对想把 Agent 从"能聊"推向"能操作业务系统"的团队，它恰好卡在关键基础设施链路上。

**▌ 它是什么？**
Composio（github.com/ComposioHQ/composio）是一个 MIT 许可的开源集成层，定位是"AI Agent 的开源版 Zapier"。它提供两类接入方式：一是传统 SDK/函数调用，给 OpenAI、Anthropic、LangChain、LangGraph、LlamaIndex、Gemini、AutoGen、CrewAI 等十余种框架提供官方绑定包；二是 MCP Gateway，把上千个工具暴露成符合 Model Context Protocol 的标准服务器，智能体用统一协议即可发现并调用。每个工具都是"动作级"的强类型定义，并自带 OAuth 令牌刷新、限流处理与错误标准化。免费层每月 2 万次工具调用，自托管版可部署在 VPC/本地。

**▌ 它解决了什么问题？**
让 Agent 真正操作外部系统，最大的坑不是"调一次 API"，而是三件事：认证、可靠性、维护。手写每个 SaaS 连接器，你要处理 OAuth 回调、令牌过期、速率限制、接口版本漂移——一个中型团队接 10 个 SaaS 可能烧掉数周。Composio 把这些繁琐活抽象成一个托管且有类型保障的层：开发者用几行代码就能让 Agent 读 GitHub Issue、发 Slack 消息、写 Salesforce 记录。它还用 entity 作用域做多租户隔离，把每个用户/组织的凭证与日志分区，满足审计要求。对初创公司，它把"接 CRM+邮件+日历"从几周压缩到几天，是 Agent 从 demo 走向生产的关键拼图。更进一步，当企业要把 Agent 接入内部系统时，Composio 的 entity 隔离还顺带解决了合规审计中最头疼的"凭证混用"问题：每个租户、每个用户的 OAuth 令牌与调用日志彼此独立，审计员可以精确回溯"哪个 agent 在何时以谁的身份调用了哪个 API"，而不必在混杂的全局密钥里翻找，这让它在金融、医疗等强监管行业也能落地。

**▌ 核心原理拆解**
Composio 把"工具调用"拆成三层，让 Agent 只关心意图：
```
Agent（Claude / LangGraph / Codex …）
  ↓ 函数调用或 MCP 协议
Composio Gateway（统一端点）
  ├─ 工具注册表: 1000+ 动作级强类型定义
  ├─ Managed Auth: OAuth 刷新、凭证保险库、entity 隔离
  ├─ 执行层: 限流、重试、幂等键、错误标准化
  ↓
外部 SaaS（GitHub / Slack / Salesforce / Gmail …）
```
关键点是"动作级而非事务级"——每个工具就是一个离散 API 动作，因此工作流要设计成多步离散调用，并配异步任务、幂等键与可观测性；MCP Gateway 则让任何兼容 MCP 的智能体零改动接入，不必为每家框架写适配。

**▌ 动手验证**
```bash
# 1. 安装 Python SDK
pip install composio-openai   # 以 OpenAI 绑定为例

# 2. 登录并授权 GitHub 工具
composio login
composio add github          # 走 OAuth，令牌由 Composio 托管刷新

# 3. 在代码里让 Agent 创建一个 Issue
from composio_openai import ComposioToolSet
toolset = ComposioToolSet(entity_id="user-1")
tools = toolset.get_tools(actions=["github_create_issue"])
# 把 tools 交给 OpenAI Agents / LangGraph 调用即可
```
验证标准：Agent 能在无手写 API 代码的情况下，经 Composio 成功在指定仓库创建 Issue；凭证刷新对上层透明。

**▌ 对比与选型**
| 对比维度 | Composio | LangChain Tools | Zapier | n8n |
|---------|---------|----------------|-------|-----|
| GitHub Star | ~29k | 生态内置 | 闭源 | ~开源 |
| 定位 | Agent 工具层 | 框架内工具 | 人工配置自动化 | 可视化工作流 |
| 模型/协议 | MCP+函数调用 | 仅框架内 | 无 | 无原生 MCP |
| 集成规模 | 1000+ | 需手写 | 数千 | 数百 |
| 适合场景 | 代码驱动 Agent | 已在 LangChain | 业务人员 | 自托管自动化 |

选型建议：做代码优先的 Agent、要 MCP 与强类型 → Composio；只想要可视化 SaaS 自动化 → Zapier/n8n；已在 LangChain 且工具少 → 直接用其 Tools。

🔗 **信息来源：** yuzec.com/tools/composio（2026，29k+ Star、250+ 工具）/ theaiagentindex.com/agents/composio（2026 Q3，29.4k Star、MCP Gateway、1000+ 集成）/ 今日头条 a7617016389831885362（2026-03，27.4k Star、Rube/MCP 路线解读）

---

### 4. 【Sweep：把 GitHub Issue 自动变成代码 PR 的开源 AI 工程师】（⭐ 约 7.7k Star）

> 📍 **导语**：Sweep 把自己定位成"住在你仓库里的 AI 初级工程师"——你在 GitHub Issue 里用自然语言描述需求或 bug，它读代码库、做计划、改文件、跑测试，然后开一个待你 review 的 PR。作为 MIT 许可的开源项目，其 Star 约 7.7k，是"Issue→PR"这一异步自动化范式最早的开源实践者之一。尽管近期社区活跃度有所下滑、仓库提交节奏放缓，但对想用最低成本给小团队补一个"夜间自动修简单 bug"能力的团队，它仍是值得了解的范本。

**▌ 它是什么？**
Sweep（github.com/sweepai/sweep）是一个用 Python 编写、Apache-2.0 许可的开源 AI PR 代理，以 GitHub App 形式运行在你的仓库里。触发方式有两种：给 Issue 打特定标签，或在 Issue/PR 评论里 @sweep。收到任务后，它会先用向量嵌入为整个仓库建立语义索引，再生成一份贴在 Issue 下的"实施计划"供人确认，确认后才进入编码阶段：按依赖关系逐文件改代码，顺带补单元测试与 docstring，最后开 PR。你若对 PR 不满意，在评论里给反馈，Sweep 会读取并推送新 commit 到同一分支。

**▌ 它解决了什么问题？**
软件团队最容易被一类"低价值但高频"的杂活拖垮：改一行配置、补一个边界测试、更新文档、修一个一眼就能看出的小 bug。这些事单独都不难，但累积起来吃掉资深工程师大量心力。Sweep 的价值在于把 AI 从"IDE 里的同步补全"前移到"仓库级的异步委托"——你派活后可以去处理别的工单，它并行地把简单 Issue 变成可合并的 PR。对单人创始人和小团队，这相当于凭空多了一个不知疲倦的初级工程师；对大团队，它把 issue backlog 的 triage 开销显著压低。当然，复杂架构决策它仍力有不逮，生成结果必须人工 review。值得一提的是，Sweep 的"异步"特性对小团队尤其友好：你睡前的 issue，醒来已是一个待合并的 PR，这种时间上的并行把单人产能放大到接近两人。即便生成质量参差，它至少完成了"定位文件+起草改动+补测试"的脏活，reviewer 只需做判断题而非填空题，review 心智负担明显下降，因此特别适合 issue 多但人力紧的长期维护项目。

**▌ 核心原理拆解**
Sweep 采用"planner-then-editor"架构，把自主改代码约束在可控步骤内：
```
触发: GitHub Issue / @sweep 评论
  ↓
向量索引: 用 embedding 索引全仓，语义检索相关文件（不依赖你写路径）
  ↓
Planner: 生成多步计划，作为 Issue 评论供人工拦截
  ↓
Editor: 按依赖图逐文件编辑，附测试与文档
  ↓
Sandbox: 可选在沙箱跑构建/测试验证
  ↓
输出: 开 PR（或按评论反馈迭代新 commit）
```
关键点是"先计划后编码 + 人在环"：计划公开可见，人在编码前就能纠偏；向量索引保证改动贴合既有架构风格，减少重复代码。sweep.yaml 还能定义排除文件与编码规范。

**▌ 动手验证**
```bash
# 1. 克隆并安装
git clone https://github.com/sweepai/sweep.git && cd sweep
pip install -e .

# 2. 在仓库安装 Sweep GitHub App，并配置 LLM 密钥
export OPENAI_API_KEY=sk-...

# 3. 创建一个清晰的 Issue，例如：
# "Sweep: 给 utils/parse.py 的 parse_config 函数补单元测试，覆盖空值与非法类型"
# 4. 等待 Sweep 在 Issue 下贴出计划并开 PR，review 后合并
```
验证标准：Issue 下出现计划评论 → 自动开出含测试的新 PR → 你评论反馈后产生新 commit。注意：复杂任务建议人工复核，且需给 bot 写权限。

**▌ 对比与选型**
| 对比维度 | Sweep | Copilot PR | SWE-agent | Cody |
|---------|-------|----------|----------|-------|
| GitHub Star | ~7.7k | 闭源无 | ~20k | ~5k |
| 许可 | Apache 2.0 | 闭源 | MIT | Apache 2.0 |
| 触发方式 | GitHub App | PR 内 | CLI/YAML | 编辑器 |
| 端到端 | Issue→PR | 仅 PR 建议 | Issue→PR | 对话/补全 |
| 适合场景 | 异步委托杂活 | 评审辅助 | 研究/基准 | 代码库问答 |

选型建议：要仓库内异步、零切换自动开 PR → Sweep；只要 PR 评审建议 → Copilot；做研究或要更强自主修复 → SWE-agent。

🔗 **信息来源：** yuzec.com/tools/sweep（2026，7.7k+ Star、Issue→PR 自动化）/ hookflow.ai/tools/sweep/audit（2026-07-13，7,701 Star、维护趋势快照）/ onegen.ai/project/sweep-ai（2026，开源 AI 初级工程师解读）

---

### 5. 【OpenCLAW：24/7 常驻、可本地运行的开源个人 AI 助理运行时】（⭐ 约 370k Star）

> 📍 **导语**：OpenCLAW 是 2026 年 GitHub 上增长最猛的开源项目之一——它从 2025 年 11 月的周末项目 Clawdbot 起步，仅约 60 天便超越 React 成为 Star 数最多的软件项目，2026 年 3 月达 25 万 Star，到 5 月数据口径已约 37.4 万 Star。其定位是"运行在你自己设备上的个人 AI 助理"：通过微信、Telegram、Discord、Slack 等 20+ 通信渠道收发消息，模型与工具都保留在用户控制之下。对想要一个"永远在线、数据自有、不依赖新 App"的本地智能体的人，它重新定义了个人助理的部署形态。

**▌ 它是什么？**
OpenCLAW（github.com/openclaw/openclaw）采用 MIT 许可，核心是一个本地运行的 Gateway：以 Node.js 进程驻留在用户机器上，把每条消息路由到对应会话、管理记忆、再把回复发回原聊天线程。它模型无关，可接 Claude、GPT、DeepSeek、Gemini，也可接 Ollama 本地模型，且能按 agent/workspace 切换模型。能力通过"claws"（基于 Markdown + YAML frontmatter 的技能包）扩展，官方技能市场 ClawHub 提供数千个社区技能，内置工具涵盖 read/write/exec/web_search/browser/memory。官方 README 明确它是单用户个人助理，而非企业多租户平台。

**▌ 它解决了什么问题？**
两个长期痛点被它一次性解决：其一，用户不想为了用 AI 再装一个新 App——OpenCLAW 让你在已经在用的聊天软件里直接对话；其二，用户不想把聊天记录与文件复制到厂商服务器——它把推理与记忆留在本地（记忆层用 SQLite 而非托管库），默认可审计。对中文用户，微信/QQ/飞书的直接支持是明显优势。开发者则看重可控性：每个技能事前声明工具权限，本地记忆可查，比许多托管智能体栈更易审计。当然，社区技能生态也带来安全风险（曾出现恶意技能事件），安装第三方 claws 前需核对发布者与权限。从工程角度看，OpenCLAW 把"个人自动化"从写脚本的苦差事变成了"装技能+连渠道"的配置活：你想让助理每天汇总邮件、定时跑报表、在群里播报构建结果，不再需要自己维护一套 cron+API 胶水代码，而是声明式地交给 claws 与调度能力，大幅降低了个人自动化的门槛，也让非专业开发者第一次能拥有真正"常驻"的自动化助手。

**▌ 核心原理拆解**
OpenCLAW 把"个人助理"拆成三层可组合部件：
```
消息渠道(微信/Telegram/Slack…)
  ↓
本地 Gateway(Node.js 常驻进程)
  ├─ 会话路由: 每条消息 → 对应 agent/workspace
  ├─ 记忆层: SQLite 持久化事实与上下文
  └─ 工具执行: read/write/exec/browser/memory
  ↓
模型层(Claude/GPT/本地 Ollama，按 agent 切换)
  ↓
Skills(claws): Markdown+YAML 声明的可安装技能包
```
关键点是"本地网关 + 渠道解耦 + 技能声明权限"：消息从哪来不重要，Gateway 统一接管；模型只负责推理，工具执行与数据归用户；技能用声明式权限降低误用面。ClawHub 提供 `claw search/install` 命令，生态即插即用。

**▌ 动手验证**
```bash
# 1. 安装 CLI（以 Telegram 最快上手）
npm install -g openclaw
openclaw onboarding          # 选择模型提供商（如 Ollama 本地）

# 2. 连接一个渠道
openclaw channel add telegram   # 按提示填 bot token

# 3. 安装一个技能
openclaw claw install <skill-name>

# 4. 在 Telegram 里直接发消息给助理，观察其调用工具与记忆
```
验证标准：在聊天软件里发指令 → 本地 Gateway 执行工具（如读写文件、联网） → 回复回到同一线程；断网时本地模型仍可运行基础任务。

**▌ 对比与选型**
| 对比维度 | OpenCLAW | Continue | GitHub Copilot | 云聊天 Bot |
|---------|---------|---------|---------------|-----------|
| GitHub Star | ~370k | ~35k | 闭源无 | 闭源无 |
| 许可 | MIT | Apache 2.0 | 闭源 | 闭源 |
| 运行位置 | 本地网关 | 编辑器内 | 云端 | 云端 |
| 渠道 | 20+ 聊天软件 | 编辑器 | 编辑器 | 单一 |
| 适合场景 | 个人常驻助理 | 编程助手 | 编码 | 问答 |

选型建议：要 24/7 个人助理、数据自有、聊天即入口 → OpenCLAW；只要编辑器内 AI 编程 → Continue；团队 GitHub 流程 → Copilot。

🔗 **信息来源：** openclaws.io/zh/blog/openclaw-250k-stars-milestone（2026-03-03，250,829 Star 里程碑）/ nav-ai.cn/openclaw-ben-di-ai-zhu-shou（2026-05-22，373,772 Star、20+ 渠道解读）/ oracore.dev/en/news/247k-github-stars-openclaw（2026-06-24，247k Star、ClawHub 与安全事件）

---

### 6. 【Kilo Code：源自 Cline/Roo 谱系、支持 500+ 模型的开源 VS Code 编码智能体】（⭐ 约 26.6k Star）

> 📍 **导语**：Kilo Code 是 2026 年开源编码智能体里的"黑马"：它从 Roo Code/Cline 谱系 fork 而来，却凭借"一个智能体跑遍 VS Code、JetBrains、CLI、云与 Slack"加上"500+ 模型零加价"的卖点迅速起量，截至 2026 年 7 月 Star 约 2.66 万、用户超 300 万、累计处理超 40 万亿 token，并拿下 Product Hunt 月度开源产品第一；更关键的是，2026 年 7 月它被 Anaconda 收购，成为其 agentic 工程层。对想在编辑器里用开源智能体、又不愿被单一模型厂商绑定的团队，这是当下最值得跟进的选项之一。

**▌ 它是什么？**
Kilo Code（github.com/Kilo-Org/kilocode）是 MIT 许可（CLI）/Apache 2.0 许可（扩展）的开源编码智能体，覆盖 VS Code、JetBrains（IntelliJ/PyCharm/WebStorm/GoLand）、独立 CLI、云 Agent 与 Slack。它内置五种模式：Architect（先出实现计划）、Code（默认编码）、Debug（读错误追因）、Ask（只问答不碰文件）、Orchestrator（在独立 git worktree 上派发并行子智能体做长 horizon 任务）。其招牌是"模型目录 500+"与"零加价"——你通过 BYOK 或 Kilo Gateway 以模型厂商原价用 Claude、GPT、Gemini、Mistral 及任意 OpenAI 兼容端点，中途可按任务换模型；MCP 市场则让你接数据库、API、工单系统等社区工具。

**▌ 它解决了什么问题？**
编码智能体的两大痛点它都正面回应。一是"模型锁定与加价"：很多工具要么只能用自家模型，要么在 token 上二次加价；Kilo 把推理层与代理层解耦，代理永远 MIT 开源可审计，推理按厂商原价走，并把"Auto Model"做成按会话分类自动选 Efficient/Frontier/Balanced/Free 档位来控费。二是"跨 surface 不一致"：团队常 VS Code 与 JetBrains 混用，Kilo 用同一套开源代理统一两端，CLI 再把同样能力带到终端，Orchestrator 模式还能在并行 worktree 上同时推进多个分支。对受监管团队，它提供 SSO、审计日志与本地模型自托管选项；对单人，免费层永久开源。对已经采用 Cline/Roo 的团队，Kilo 的价值还在于"不丢失既有习惯"——它的模式命名与交互延续了 Roo 谱系，却补上了企业最在意的集中计费、用量分析与模型限制；对预算敏感的个人，Auto Model 把"简单补全走免费模型、复杂重构走前沿模型"做成默认策略，让 40 万亿 token 级别的用量也能控制在可承受成本内，避免了"用着用着账单失控"的常见困境。

**▌ 核心原理拆解**
Kilo 把"agentic 编码"组织成可切换的模式与可委托的编排：
```
用户输入(编辑器/CLI/Slack)
  ↓
模式路由: Architect→Plan→Code / Debug / Ask / Orchestrator
  ↓
模型路由(Auto Model / BYOK / Gateway，零加价)
  ↓
工具层: 文件编辑、终端、浏览器、MCP 市场、自校验
  ↓
Orchestrator: 在独立 git worktree 派发并行子智能体
  ↓
输出: 多文件改动 / PR / 后台自动化
```
关键点是"模式 + 模型双层路由"与"worktree 隔离的并行"：模式决定Agent 是否碰文件、是否先计划；模型路由把花销与能力解耦；Orchestrator 用隔离 worktree 避免多任务互相踩踏。`kilo run --auto` 还能在 CI 里全自动跑测试修失败（仅限受信环境）。

**▌ 动手验证**
```bash
# 1. VS Code 安装 Kilo Code 扩展；或全局装 CLI
npm install -g @kilocode/cli
# brew install Kilo-Org/tap/kilo   # macOS 备选

# 2. 在项目目录启动（默认 Code 模式）
kilo

# 3. 在 CI 里全自动修测试（仅受信环境！）
kilo run --auto "run tests and fix any failures"

# 4. 切换模式示例：先 Architect 出计划，再 Code 实现
# 在对话里输入 /architect 设计特性 → /code 实施
```
验证标准：扩展内出现五种模式切换、能用 Ollama 本地模型零费用编码、Orchestrator 在并行 worktree 推进多任务。注意 `--auto` 会关闭所有确认，务必沙箱化。

**▌ 对比与选型**
| 对比维度 | Kilo Code | Cline | Continue | GitHub Copilot |
|---------|---------|-------|---------|---------------|
| GitHub Star | ~26.6k | ~59k | ~35k | 闭源无 |
| 许可 | MIT/Apache2 | Apache 2.0 | Apache 2.0 | 闭源 |
| 模型数 | 500+ 零加价 | 311+ | 任意 | 受限 |
| 多 IDE | VS Code+JB+CLI | VS Code | VS Code+JB | VS Code+JB |
| 适合场景 | 跨端+控费 | 编辑器智能体 | 本地模型 | GitHub 生态 |

选型建议：要跨 IDE 统一、按任务控费、不被锁定 → Kilo Code；只要 VS Code 内人类在环智能体 → Cline；要完全本地模型 → Continue；团队深度 GitHub → Copilot。

🔗 **信息来源：** theaiagentindex.com/agents/kilo-code（2026 Q3，26.6k Star、Anaconda 收购、3M+ 用户）/ llm-explorer.com/agent/kilo-code（2026-07-23，26,473 Star、MIT、500+ 模型）/ ghtrends.dev/Kilo-Org/kilocode（2026-06，22,966 Star、与 Cline/Continue 对比）/ kilo.ai（2026-07，Anaconda 收购与 500+ 模型公告）
