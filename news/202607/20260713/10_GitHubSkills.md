# 10_GitHubSkills · 2026-07-13

> 今日聚焦 GitHub Trending 与新兴开源项目，全部为模块 10 近期未覆盖的全新方向（LangGraph/CrewAI/Ollama/llama.cpp/CubeSandbox/Dify/Qwen3 均已回避）。

---

### 1. 【Agent技能协议】agency-agents：定义可插拔 AI Agent 技能标准的完整框架（⭐⭐ 单日 +3032 Star）

> 📍 **导语**：2026 年 7 月 GitHub 日榜榜首。agency-agents 提出一套"技能协议标准"，让 Agent 能按需插拔技能模块，解决不同项目重复造轮子、能力无法复用的痛点。单日新增 3032 Star，是本月 Agent 技能生态爆发的主线项目之一。

- **项目定位**：一个"指尖上的完整 AI 代理"——人格化、流程化、可交付的 Agent 体系，把技能抽象成可热插拔的模块。
- **为什么值得关注**：Agent 正从"完整产品"解耦为"核心引擎 + 技能生态"，它定义的就是那层标准接口。
- 🔗 来源：GitHub Trending 日榜（2026-07-03）/ wangruofeng007.com GitHub 趋势洞察

---

### 2. 【极简Agent】caveman：用 300 行核心代码把 AI 变成直接可调用的 shell 命令（⭐⭐ 单日 +926 Star）

> 📍 **导语**：周榜头部项目，走极简路线，核心代码仅约 300 行。它把大模型包装成一个可像普通命令一样直接调用的 shell 工具，并用"洞穴人说话风格"砍掉约 65% 的 token 消耗。对想快速把 AI 塞进现有脚本流的开发者极友好。

- **项目定位**：一个 Claude Code 风格的技能，让 AI 退化为一个"能调用的命令行工具"，而非一个对话窗口。
- **为什么值得关注**：用极小体积证明——Agent 的入口可以是命令而非聊天框，token 成本也能大幅压缩。
- 🔗 来源：GitHub Trending 日榜（2026-07-03）/ wangruofeng007.com

---

### 3. 【技能市场】superpowers：为编程代理打造的结构化开发技能框架（⭐⭐ 月榜榜首，500+ 技能上架）

> 📍 **导语**：本月 GitHub 月榜榜首。superpowers 主打"技能市场"模式，开发者可上传、分享、复用结构化技能包，目前已上架 500+ 技能。它与 agency-agents、caveman 共同指向同一趋势：Agent 开发门槛正在从"写框架"降到"攒技能"。

- **项目定位**：编程代理的结构化开发技能框架，把最佳实践沉淀为可分发、可组合的技能包。
- **为什么值得关注**：技能市场一旦形成网络效应，单个开发者的能力可被无限放大。
- 🔗 来源：GitHub Trending 月榜（2026-07）/ obra/superpowers

---

### 4. 【AI记忆平台】cognee：给 Agent 装上可持久化的知识图谱长期记忆（⭐⭐ ~26.4k Star，本周 +5.1k）

> 📍 **导语**：cognee 自我定位为"面向 Agent 的开源 AI 记忆平台"。它接收任意格式数据，持续构建一张自托管的知识图谱，让接入的 Agent 在多次会话间拥有持久长期记忆。抓取当日约 26,464 Star，本周新增约 5,171 Star。

- **项目定位**：把"记忆"从模型上下文里抽出来，变成可审计、可持久、低 token 成本的外部工程层（harness 三支柱之一）。
- **为什么值得关注**：当模型足够强，"记得住、跑得稳"比"写得出"更稀缺。
- 🔗 来源：AI 架构与 Harness 工程周报（2026-07-02）/ cognee GitHub

---

### 5. 【AI安全测试】strix：开源 AI 驱动的渗透测试工具（⭐⭐ 单日 +2137 Star）

> 📍 **导语**：GitHub 日榜第二（单日 +2137 Star）。strix 把大模型代理用于渗透测试流程，自动化 reconnaissance、漏洞探测与利用建议，降低安全测试对资深红队人员的依赖。

- **项目定位**：开源的 AI 渗透测试代理，让安全扫描从"堆脚本"走向"会思考的自动化"。
- **为什么值得关注**：AI 原生安全工具正快速进入 GitHub Trending 头部，strix 是其中的代表样本。
- 🔗 来源：GitHub Trending 日榜（2026-07-03）/ usestrix/strix

---

### 6. 【向量数据库】zvec：阿里开源的进程内轻量高速嵌入式相似度搜索（⭐⭐ 进程内向量库）

> 📍 **导语**：在 GitHub 开源项目日报中上榜（alibaba/zvec，C++）。zvec 是进程内（in-process）向量数据库，主打轻量、高速的嵌入式相似性搜索，适合把向量检索直接编译进应用，免去独立向量服务部署成本。

- **项目定位**：嵌入式向量引擎，让相似度检索像调用一个本地库一样简单，零运维。
- **为什么值得关注**：RAG / 记忆类 Agent 对低延迟向量检索需求旺盛，进程内方案是边缘与端侧场景的优选。
- 🔗 来源：GitHub 开源项目日报（2026-07-08）/ alibaba/zvec

---

### 7. 【Git工作流】gh-stack：GitHub 原生堆叠式 PR 工作流 CLI 扩展（⭐ GitHub 官方生态）

> 📍 **导语**：来自 InfoQ 报道，GitHub 通过 `gh-stack` CLI 扩展推出原生堆叠式 Pull Request 工作流，填补了多年由第三方工具弥补的空白，解决"大 PR 地狱"——审查者丢上下文、反馈质量下降、合并缓慢易冲突。

- **项目定位**：把大型变更拆成小单元逐层审查的 Git 工作流工具，核心命令 `gh stack sync` 级联 rebase 并原子推送。
- **为什么值得关注**：与 AI 代理集成（`gh skill install github/gh-stack`），代理可学会把大 diff 拆成多层，工程化价值高。
- 🔗 来源：InfoQ 中文（2026-05-01）/ github/gh-stack

---

### 8. 【MCP服务器】Desktop Commander：让 AI 直接控制终端与编辑文件的 MCP 服务（⭐⭐ TypeScript）

> 📍 **导语**：GitHub 开源项目日报上榜（wonderwhy-er/DesktopCommanderMCP，TypeScript/JavaScript）。它是 AI 终端控制与文件编辑的 MCP 服务器，让兼容 MCP 的编码代理能直接读写文件、执行命令、管理进程，是 Agent 接管本地工作区的经典基础设施。

- **项目定位**：把"文件系统 + 终端"暴露为标准 MCP 接口，让 Agent 从"给建议"升级为"真操作"。
- **为什么值得关注**：MCP 生态是 2026 年 Agent 工具化的核心协议，Desktop Commander 是最常被引用的本地执行型 MCP 服务之一。
- 🔗 来源：GitHub 开源项目日报（2026-07-08）/ wonderwhy-er/DesktopCommanderMCP

---

*本日报基于 GitHub Trending、GitHub 官方 Changelog 与公开开源项目榜单整理，Star 数为抓取时段近似值，仅供方向参考。*
