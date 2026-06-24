# GitHub 热门开源项目推荐（2026-06-24）

> 今日 GitHub Trending 被 AI Agent 生态全面占据，视频生产、代码智能、Agent 配置与创意工具四大方向各有亮点。

---

### 1. 【OpenMontage（⭐⭐ 15,693 Stars）】首个开源 Agentic 视频生产系统，让 AI 编程助手变身视频工作室

📍 摘要：今日涨星 +3,592 登顶 GitHub Trending，世界首个开源 agentic 视频生产管线，将 AI coding agent 扩展为完整视频工作室。

OpenMontage 是当前 GitHub 上最炙手可热的 AI 视频生产开源项目。它提供了一套完整的 agentic 视频生产系统，包含 12 条预设流水线、52 个专业工具和 500+ agent 技能，覆盖从脚本撰写、素材采集、AI 生成到剪辑渲染的全流程。开发者可以在 Claude Code、Codex CLI、Cursor 等 AI 编程助手中直接调用这些管线，用自然语言指令完成高质量视频的自动化生产。项目采用模块化架构，每条流水线都可独立定制和扩展。其核心创新在于将视频制作分解为 agent 可理解的子任务序列，并利用 MCP 协议与主流 AI 工具深度集成。今日以近 3,600 星涨幅登顶，反映出"AI 视频生产工具化、agent 化"已成为当前最炙手可热的赛道，开发者对可控、可定制的开源视频生成管线需求极为旺盛。

🔗 来源：https://github.com/calesthio/OpenMontage

---

### 2. 【codebase-memory-mcp（⭐⭐ 12,951 Stars）】高性能代码知识图谱 MCP 服务器，毫秒级代码库索引方案

📍 摘要：单静态二进制零依赖，158 种语言支持，毫秒级索引+亚毫秒查询，将代码库转化为持久化知识图谱，token 消耗降低 99%。

codebase-memory-mcp 是今日 GitHub Trending 上工程实现最为惊艳的项目之一。它以一个零依赖的静态二进制文件提供了完整的高性能代码智能服务：将整个代码库索引为持久化的知识图谱，支持 158 种编程语言，平均仓库索引时间仅需毫秒级，查询响应更是达到亚毫秒级别。更关键的是，它通过 MCP（Model Context Protocol）协议，将代码知识直接注入 AI 编程助手的上下文，使 Claude Code、Codex CLI、Cursor 等工具在处理大代码库时 token 消耗降低 99%。项目用 C 语言编写，单文件部署，没有任何运行时依赖。相比于传统的代码搜索或 RAG 方案，codebase-memory-mcp 选择在本地构建完整语义图并持久化缓存，每次增量更新而非全量重建，极大提升了大规模代码库的 Agent 开发体验。今日 +1,300 星涨幅杀入前三，是 MCP 生态中最值得关注的底层基础设施之一。

🔗 来源：https://github.com/DeusData/codebase-memory-mcp

---

### 3. 【gstack（⭐⭐ 114,079 Stars）】YC 总裁 Garry Tan 亲测的 Claude Code 配置，23 个 AI Agent 角色开箱即用

📍 摘要：YC 总裁 Garry Tan 将其团队级 Agent 配置开源，包含 23 个分工明确的角色工具，从 CEO 到 QA 全覆盖，今日 +1,011 星。

gstack 是 Y Combinator 总裁 Garry Tan 公开的 Claude Code 配置集合，本质上是一套经过实战检验的"agent 团队编排方案"。它定义了 23 个定位精准的工具角色，分别模拟 CEO、产品设计师、工程经理、发布经理、文档工程师和 QA 测试员，每个角色都有独立的 system prompt、工具集和行为约束。开发者可以直接将这些配置导入 Claude Code，瞬间获得一个完整的"虚拟创业团队"。gstack 的价值不仅在于名人效应——它代表了当前 agent 工程的最高水平实践：从单 agent 对话进化到多 agent 协作体系，每个角色都有明确的职责边界和协作协议。项目开源后迅速获得开发者追捧，今日涨幅 +1,011 星，总星数突破 11.4 万，成为 Claude Code 生态中最具影响力的工程实践参考之一。

🔗 来源：https://github.com/garrytan/gstack

---

### 4. 【Palmier Pro（⭐⭐ 8,424 Stars）】专为 AI 设计的 macOS 视频编辑器，原生 Mac 体验 + AI 工作流

📍 摘要：今日涨幅 +1,630 星位列第二，Swift 原生编写的 macOS 视频编辑器，将 AI 工作流深度嵌入视频剪辑流程。

Palmier Pro 是今日 GitHub Trending 上最独特的项目之一——它不是 Python 写的 AI 工具，而是一个用 Swift 原生开发的 macOS 视频编辑器。它将 AI 工作流深度集成到视频剪辑的核心操作中：AI 驱动的智能片段裁剪、自动字幕生成和翻译、基于语义的场景分割、以及 AI 辅助的色彩分级。与 OpenMontage 这样的 agentic 管线不同，Palmier Pro 聚焦在桌面端专业视频编辑场景，提供原生 Mac 应用的流畅交互体验。它支持插件系统，开发者可以编写自定义 AI 处理模块。项目由 palmier-io 团队开发，目前处于早期阶段但增长迅猛，今日以 +1,630 星的涨幅高居榜单第二，反映出"AI + 专业创意工具"正从云端走向桌面，原生应用的体验优势正在被重新重视。

🔗 来源：https://github.com/palmier-io/palmier-pro
