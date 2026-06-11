# GitHub Skills | 2026-06-09

---

### 1. 【browser-use + AI浏览器自动化进入Rust时代】

当你需要批量填写100份在线表单、每天跟踪20个竞品的价格变动、或者让AI替你在多个电商平台比价下单——手动操作浏览器正在成为开发者最不愿意面对的体力活。browser-use在2026年6月发布了v0.13版本，用Rust重写了整个Agent核心，让AI操控浏览器这件事从"概念验证"正式进入了"生产级性能"阶段。97.9k Stars和10.9k Fork的背后，是一个正在重塑"人机交互边界"的开源运动。

**项目数据速览**

| 指标 | 数据 |
|------|------|
| Stars | 97.9k |
| Forks | 10.9k |
| 最新版本 | v0.13.0 (2026-06-08) |
| 开源协议 | MIT |
| 主要语言 | Python 98.3% (Rust核心beta) |
| Commits | 9,695 |
| Watchers | 439 |

**解决什么痛点**

传统浏览器自动化（Selenium、Playwright脚本）本质是"录制-回放"模式：你写好每一步操作，脚本机械执行。一旦页面改版、弹窗出现、验证码拦截，脚本就崩溃了。browser-use的核心突破在于：AI实时"看"页面、理解页面语义、自主决策下一步操作。这意味着——页面改版不怕，弹窗能处理，复杂流程能自主规划。而v0.13用Rust重写核心后，启动速度提升3-5倍，内存占用降低60%，为大规模并发场景铺平了道路。

**核心原理与架构**

browser-use 0.13的架构从纯Python演进为Python+Rust双引擎：

```
Python API层 → Rust Core (高性能浏览器操控) → Browser Harness → Web Task
```

关键设计决策：
- **Rust驱动核心**：底层浏览器操作（DOM解析、事件注入、页面截图）全部在Rust侧执行，Python只负责高层任务编排和LLM调用
- **Browser Harness**：为前沿模型构建的"真实浏览器操作空间"——模型看到的不是抽象API，而是真实的DOM结构、可点击元素列表和视觉截图
- **持久化恢复循环**：借鉴编程Agent的设计，支持任务中断后从上次状态恢复，而非从头重跑
- **双API共存**：旧版Python Agent通过`from browser_use import Agent`使用，新版Rust Agent通过`from browser_use.beta import Agent`引入，平滑迁移

模型层的设计同样值得关注。browser-use推出了专有的ChatBrowserUse模型，针对浏览器操控场景做了专项优化：
- 速度比通用LLM快3-5倍（浏览器操作需要快速连续决策，延迟是致命的）
- SOTA准确率（在WebArena基准测试上超越GPT-5.5和Claude Opus）
- 同时兼容OpenAI、Google、Anthropic、本地Ollama等主流LLM

**5分钟快速上手**

安装与基本运行：

```bash
# 安装（需要Python >= 3.11）
uv add "browser-use[core]"
# 或 pip install "browser-use[core]"

# 配置API Key
export BROWSER_USE_API_KEY=your-key
```

最小化运行示例——让AI查找GitHub仓库的Star数：

```python
from browser_use.beta import Agent, BrowserProfile, ChatBrowserUse
import asyncio

async def main():
    agent = Agent(
        task="Find the number of stars of the browser-use repo on GitHub",
        llm=ChatBrowserUse(),  # 专有模型，速度快3-5倍
        browser_profile=BrowserProfile(
            headless=False,
            allowed_domains=["*.github.com"],  # 安全边界：只允许访问GitHub
        ),
    )
    history = await agent.run()
    print(history.final_result())

if __name__ == "__main__":
    asyncio.run(main())
```

CLI命令行模式——直接在终端操控浏览器：

```bash
browser-use open https://example.com    # 导航到URL
browser-use state                       # 查看当前页面可点击元素
browser-use click 5                     # 按索引点击第5个元素
browser-use type "Hello World"          # 在当前输入框输入文本
browser-use screenshot page.png         # 截图保存
browser-use close                       # 关闭浏览器
```

模板化快速启动：

```bash
uvx browser-use init --template default   # 最小化入门
uvx browser-use init --template advanced  # 全配置详解
uvx browser-use init --template tools     # 自定义工具扩展
```

**真实场景实战**

场景1：自动化竞品价格监控。每天凌晨运行Agent，遍历10个竞品页面，提取价格信息写入数据库：

```python
agent = Agent(
    task="Visit these product pages and extract the current price: [URLs list]",
    llm=ChatBrowserUse(),
    browser_profile=BrowserProfile(headless=True),  # 生产环境用headless
)
results = await agent.run()
# results.final_result() 包含结构化价格数据
```

场景2：批量职位申请表填写。AI读取简历文件，自动在多个招聘网站填写表单：

```python
agent = Agent(
    task="Apply to the Software Engineer position at Company X. Use my resume data: [resume text]",
    llm=ChatAnthropic(model='claude-sonnet-4-8'),  # 也可用其他LLM
    browser_profile=BrowserProfile(
        allowed_domains=["*.companyx.com"],
    ),
)
```

场景3：MCP集成。browser-use提供MCP Server配置，让任何兼容MCP的AI Agent直接获得浏览器操控能力：

```json
{
  "mcpServers": {
    "browser-use": {
      "command": "uvx",
      "args": ["browser-use-mcp"]
    }
  }
}
```

**选型对比表**

| 方案 | 核心优势 | 编程模式 | Agent能力 |
|------|----------|----------|-----------|
| browser-use | AI自主决策 | Python/Rust | 实时视觉理解 |
| Selenium | 确定性脚本 | Python/Java | 无 |
| Playwright | 现代浏览器API | Python/JS | 无 |
| UI-TARS | 多模态桌面端 | TypeScript | 视觉+GUI |

**学习路线**

1. **入门**：用`default`模板跑第一个Agent任务 → 理解task、llm、browser_profile三个核心参数
2. **进阶**：自定义Tools扩展Agent能力 → 配置allowed_domains做安全边界 → headless模式部署
3. **生产**：切换Rust beta Agent提升性能 → 配合云端版处理验证码和代理轮换 → MCP Server集成到现有Agent系统
4. **深度**：研究Rust Core架构 → 理解Browser Harness设计 → 贡献自定义工具插件

**来源**

- GitHub: https://github.com/browser-use/browser-use (97.9k Stars)
- 官网: https://browseruse.com

---

### 2. 【RAGFlow + 企业级RAG引擎融合Agent能力】

企业部署AI最大的痛点不是模型不够聪明，而是模型看不到你的数据。PDF里的表格、扫描件中的手写签名、Excel中的嵌套结构——传统RAG系统面对这些"脏数据"要么直接放弃，要么提取出一堆不可读的碎片。RAGFlow用"深度文档理解+模板化分块+Agent融合"三板斧，把"高质量输入，高质量输出"从口号变成了工程现实。82.3k Stars证明：企业需要的不是又一个RAG demo，而是真正能处理复杂数据的生产级引擎。

**项目数据速览**

| 指标 | 数据 |
|------|------|
| Stars | 82.3k |
| Forks | 9.5k |
| 最新版本 | v0.25.6 (2026-05-27) |
| 开源协议 | Apache-2.0 |
| 主要语言 | Python 43.9%, TypeScript 26.7%, Go 21.2% |
| Commits | 6,637 |
| Releases | 47 |

**解决什么痛点**

传统RAG系统的三大致命缺陷：
1. **文档解析弱**：PDF扫描件、嵌套表格、图片中的文字提取失败率高达40%
2. **分块不可解释**：按固定token数切分，一段完整的合同条款被拆成碎片，语义断裂
3. **缺乏Agent协作**：RAG只是"检索-生成"，没有规划、反思、工具调用等Agent能力

RAGFlow的解决思路是：先让文档理解做到极致（Deep Document Understanding），再用模板化分块保证语义完整性，最后融合Agent能力让系统不只是"回答问题"，而是"规划、执行、验证、迭代"。

**核心原理与架构**

RAGFlow采用容器化微服务架构，核心依赖四个基础设施组件：

```
RAGFlow App → MinIO (对象存储) → Elasticsearch/Infinity (全文+向量检索)
             → Redis (缓存) → MySQL (关系数据)
```

关键技术设计：
- **深度文档理解**：不只是OCR文字提取，而是理解文档结构——识别标题层级、表格列关系、图片语义、代码块边界。这让扫描件PDF的表格数据提取准确率从40%提升到92%
- **模板化分块**：提供丰富的预构建分块模板（法律合同、学术论文、财务报表、技术文档等），每种模板针对特定文档类型做了语义边界优化。分块过程可视化，支持人工干预调整
- **有据可依的引用**：每个回答都附带原文引用和可追溯路径，用户可以快速验证AI是否在"编造"。文本分块可视化展示，支持手动修正
- **Agent融合**：从v0.25.0开始，RAGFlow不再只是RAG引擎，而是RAG+Agent双引擎：
  - 支持Agentic工作流和MCP协议
  - Python/JavaScript代码执行器组件
  - Agent记忆(Memory)功能——跨对话持久化用户偏好和历史结论
  - 预构建Agent模板（数据分析Agent、文档问答Agent等）
  - Agent应用可发布为独立服务

近期重要更新（2026年）：
- v0.25.6 (2026-05-27)：七个预构建数据摄入流水线模板、Agent应用发布、沙箱代码执行和图表生成
- 支持DeepSeek v4模型
- OpenClaw上的RAGFlow Skill——通过OpenClaw直接访问RAGFlow数据集
- 支持从Confluence、S3、Notion、Discord、Google Drive同步数据
- 跨语言查询（用中文提问，检索英文文档并翻译回答）

**5分钟快速上手**

Docker Compose一键部署：

```bash
# 克隆项目
git clone https://github.com/infiniflow/ragflow.git
cd ragflow

# Docker部署（需要docker >= 24.0.0）
docker compose -f docker/docker-compose.yml up -d

# 等待服务启动后访问
# http://localhost:80 用户界面
# http://localhost:9380 API端点
```

Python SDK调用：

```python
from ragflow_sdk import RAGFlow

# 初始化客户端
client = RAGFlow(api_key="your-api-key", base_url="http://localhost:9380")

# 创建知识库
dataset = client.create_dataset(name="company_docs")

# 上传文档（支持PDF、Word、Excel、图片、扫描件）
dataset.upload_documents([
    "/path/to/contract.pdf",
    "/path/to/financial_report.xlsx",
    "/path/to/scanned_invoice.jpg"
])

# 创建Agent
agent = client.create_agent(
    name="doc_analyst",
    dataset_ids=[dataset.id],
    llm_model="deepseek-v4"
)

# 对话查询
response = agent.chat("这份合同第3.2条款的违约责任是什么？")
print(response.answer)
# 输出会附带原文引用和文档页码
```

异构数据源同步：

```python
# 从Confluence同步
dataset.sync_from_confluence(
    base_url="https://your-company.atlassian.net",
    space_key="ENG",
    token="your-confluence-token"
)

# 从Notion同步
dataset.sync_from_notion(
    token="your-notion-token",
    page_ids=["page-id-1", "page-id-2"]
)
```

**真实场景实战**

场景1：法律合同审查。律师上传50份合同PDF，RAGFlow自动提取关键条款（违约责任、付款条件、保密义务），Agent对比分析风险点：

```python
agent.chat("对比这50份合同的违约金条款，找出最苛刻的3份")
# Agent会：检索所有违约条款 → 结构化提取金额和触发条件 → 对比排序 → 附原文引用
```

场景2：多语言技术文档问答。中国团队用中文提问，检索英文技术文档，Agent自动翻译并回答：

```python
agent.chat("CUDA 12的stream memory pool怎么用？")
# 跨语言查询：中文问题 → 英文检索 → 翻译回答 + 原文引用
```

场景3：数据分析Agent。上传Excel财报，Agent自动生成可视化图表和财务分析报告：

```python
agent = client.create_agent(
    name="financial_analyst",
    template="data_analysis",  # 预构建数据分析模板
    dataset_ids=[dataset.id]
)
agent.chat("分析这3年的营收增长趋势，生成折线图")
# Agent执行：解析Excel → 计算趋势 → 生成Python代码 → 在沙箱中执行 → 输出图表
```

**选型对比表**

| 方案 | 文档解析 | 分块策略 | Agent能力 |
|------|----------|----------|-----------|
| RAGFlow | 深度理解92% | 模板化可干预 | RAG+Agent双引擎 |
| LangChain | 依赖外部工具 | 固定token切分 | 框架级支持 |
| AnythingLLM | 基础OCR | 简单分块 | 无Agent |
| Dify | 中等 | 可配置 | Agent编排 |

**学习路线**

1. **入门**：Docker Compose部署 → 创建知识库 → 上传PDF体验深度文档理解 → 查看分块可视化
2. **进阶**：配置自定义分块模板 → 接入Confluence/Notion数据源 → 创建数据分析Agent → 多语言查询
3. **生产**：切换Elasticsearch到Infinity引擎提升检索性能 → 配置Agent沙箱安全策略 → API发布Agent服务 → 接入MCP生态
4. **深度**：研究深度文档理解算法 → 贡献自定义分块模板 → 开发垂直领域Agent模板 → 参与RAGFlow社区治理

**来源**

- GitHub: https://github.com/infiniflow/ragflow (82.3k Stars)
- 官网: https://ragflow.io

---

### 3. 【Firecrawl + 网页数据成为AI Agent的第一语言】

AI Agent要执行任务，第一步不是"思考"，而是"看数据"。但互联网上的网页不是为AI设计的——它们充满了JS渲染阻塞、反爬机制、Cookie陷阱和嵌套DOM结构。Firecrawl做的事情看似简单：把任何网页变成AI可直接消费的干净数据。但当你意识到这130k Stars背后是"96%网页覆盖率、P95延迟3.4秒、MCP原生集成"的时候，就会发现它正在成为AI Agent的基础设施层——就像DNS之于互联网，Firecrawl之于AI Agent。

**项目数据速览**

| 指标 | 数据 |
|------|------|
| Stars | 130k |
| Forks | 7.7k |
| 最新版本 | v2.10 (2026-05-15) |
| 开源协议 | AGPL-3.0 |
| 主要语言 | TypeScript 67.3%, Python 16.6%, Rust 4.9% |
| Commits | 5,603 |
| Releases | 34 |

**解决什么痛点**

AI Agent面对网页数据时的四大障碍：
1. **JS渲染阻塞**：60%的现代网页需要JS执行后才能看到真实内容，传统爬虫拿到的是空白骨架HTML
2. **数据格式混乱**：网页内容嵌在CSS布局、广告、导航栏中，直接喂给LLM会浪费80%的Token
3. **反爬拦截**：代理轮换、速率限制、验证码、Cookie认证——单个开发者几乎无法绕过
4. **缺乏Agent接口**：传统爬虫是"抓完就完"，但Agent需要"看-思考-操作-再看"的循环

Firecrawl用一套统一的API同时解决这四个问题：Search（搜索）、Scrape（抓取单页）、Crawl（爬取全站）、Interact（AI交互）、Agent（自主采集）、Map（站点发现）。并且通过MCP协议，让任何AI Agent都能一条命令接入实时Web数据。

**核心原理与架构**

Firecrawl的技术栈横跨6种语言，但核心引擎是TypeScript+Rust：

```
API Gateway → TypeScript Core Engine → Rust Rendering Pipeline → Chrome Headless Pool
            → Python SDK / Node SDK / Java SDK / Rust SDK / Go SDK
            → MCP Server (AI Agent原生接入)
```

核心设计亮点：
- **零配置处理**：自动处理代理轮换、速率限制、JS阻塞内容、Cookie管理——开发者不需要关心任何一个
- **LLM就绪输出**：默认输出干净Markdown（而非原始HTML），减少80%的Token消耗。同时支持结构化JSON提取——定义schema，Firecrawl自动把网页内容映射到你的数据模型
- **Interact端点**：抓取页面后，通过AI提示或代码与页面交互（点击、滚动、输入）——这让Agent不只是"读取"网页，而是"操作"网页
- **Agent端点**：描述你想要什么数据，Agent自主搜索、导航、提取——不需要提供URL，只需要描述需求

MCP Server设计：
Firecrawl的MCP Server提供了14个工具，覆盖搜索、抓取、爬取、结构化提取、浏览器交互、自主研究等全部能力。一条命令安装：

```bash
npx -y firecrawl-cli@latest init --all --browser
```

安装后重启Agent即可使用，兼容Claude Code、Antigravity、OpenCode等主流Agent客户端。

SDK覆盖完整：
- Python: `pip install firecrawl-py`
- Node.js: `npm install firecrawl`
- Java: JitPack依赖
- Rust: `firecrawl = "2"` (crates.io)
- Go: 社区SDK
- Elixir: `{:firecrawl, "~> 1.0"}`

**5分钟快速上手**

安装SDK：

```bash
pip install firecrawl-py
```

基础抓取——把网页转为干净Markdown：

```python
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="fc-YOUR_API_KEY")

# 抓取单页，输出Markdown
result = app.scrape_url("https://news.ycombinator.com")
print(result["markdown"])  # 干净的Markdown内容，无广告/导航栏

# 结构化提取——定义schema，自动映射
schema = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "author": {"type": "string"},
        "date": {"type": "string"},
        "content": {"type": "string"}
    }
}
result = app.scrape_url("https://example-blog.com/article", extract=schema)
print(result["extract"])  # {"title": "...", "author": "...", ...}
```

搜索——AI Agent先搜索再抓取：

```python
# 搜索并返回完整页面内容
results = app.search("latest AI agent frameworks 2026")
for r in results:
    print(r["markdown"])  # 每个搜索结果的完整Markdown内容
```

Agent模式——描述需求，自主采集：

```python
# 不需要提供URL，Agent自己搜索和导航
result = app.agent(
    prompt="Find all GitHub repositories with >50k stars that are AI agent frameworks, and extract their description, star count, and last commit date"
)
print(result)
```

MCP配置——让任何Agent客户端接入：

```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-YOUR_API_KEY"
      }
    }
  }
}
```

**真实场景实战**

场景1：竞品调研Agent。定期搜索竞品产品页面，提取定价、功能列表、更新日志：

```python
agent_prompt = """
Search for all pricing pages of these competitors:
- cursor.sh
- codeium.com
- sourcegraph.com
Extract: product name, pricing tiers, monthly price, key features per tier
"""
result = app.agent(prompt=agent_prompt)
```

场景2：投资研究Agent。搜索财报新闻，提取关键财务指标：

```python
schema = {
    "type": "object",
    "properties": {
        "company": {"type": "string"},
        "revenue": {"type": "string"},
        "net_income": {"type": "string"},
        "eps": {"type": "string"},
        "guidance": {"type": "string"}
    }
}
result = app.search("NVDA Q1 2026 earnings report", extract=schema)
```

场景3：CI/CD集成。在自动化流水线中抓取API文档，生成SDK代码：

```bash
# CLI模式
firecrawl scrape https://api.example.com/docs --format markdown > api_docs.md
firecrawl crawl https://docs.example.com --limit 100 --format json
```

**选型对比表**

| 方案 | 网页覆盖率 | 输出格式 | MCP集成 |
|------|-----------|----------|---------|
| Firecrawl | 96% | Markdown/JSON | 14工具原生 |
| Scrapy | 70% | HTML/Raw | 无 |
| BeautifulSoup | 30%(无JS) | HTML | 无 |
| Jina Reader | 85% | Markdown | 基础 |

**学习路线**

1. **入门**：pip安装 → scrape_url抓取第一个网页 → 体验Markdown输出质量 → 用schema做结构化提取
2. **进阶**：search API搜索模式 → crawl全站爬取 → Interact端点操控页面 → Agent模式自主采集
3. **生产**：MCP Server集成到Agent系统 → 自托管部署（AGPL合规） → 配合RAGFlow构建知识库 → 批量抓取+结构化存储
4. **深度**：研究Rust渲染管线 → 贡献新SDK语言 → 开发垂直领域爬取模板 → 参与MCP生态治理

**来源**

- GitHub: https://github.com/firecrawl/firecrawl (130k Stars)
- 官网: https://firecrawl.dev

---

### 4. 【TradingAgents + 多智能体协作模拟专业交易机构】

量化交易正在从"数学模型驱动"转向"AI Agent协作驱动"。传统量化系统靠一个人写策略、调参数、盯回测——但真实的交易机构从来不是一个人在战斗：分析师看基本面、研究员看情绪、交易员看时机、风控盯止损、基金经理拍板。TradingAgents把这个"专业团队协作"模式完整搬进了代码，用LLM驱动每个角色自主思考、辩论、决策。84.7k Stars、16.4k Fork——金融AI赛道里，它是第一个把"多Agent协作"从论文概念变成可运行框架的项目。

**项目数据速览**

| 指标 | 数据 |
|------|------|
| Stars | 84.7k |
| Forks | 16.4k |
| 最新版本 | v0.2.5 (2026-05-11) |
| 开源协议 | Apache-2.0 |
| 主要语言 | Python 99.9% |
| Commits | 204 |
| Watchers | 640 |

**解决什么痛点**

传统量化系统的三个结构性缺陷：
1. **单一维度分析**：纯技术指标策略忽略基本面和情绪面，纯基本面策略忽略技术信号——"只看一面"注定在极端行情中失效
2. **缺乏辩论机制**：传统回测只有"输入→输出"，没有"看涨vs看跌"的结构化辩论。决策缺乏压力测试
3. **风控缺失**：大多数开源量化框架没有独立的风控层——策略可以无限制亏损直到回测结束

TradingAgents用"多Agent分工协作+结构化辩论+独立风控"解决了这三个问题。它不是让你选一个最好的模型，而是让多个角色各自分析、辩论、验证、最终由基金经理拍板。

**核心原理与架构**

TradingAgents基于LangGraph构建，框架设计模拟真实交易机构的完整决策链：

```
数据输入 → Analyst Team (4人并行) → Researcher Team (看涨vs看跌辩论)
         → Trader Agent (综合决策) → Risk Management (风险评估)
         → Portfolio Manager (最终拍板) → Simulated Exchange (订单执行)
```

每个角色的具体职责：

**Analyst Team（4人并行分析）**：
- Fundamentals Analyst：评估公司财务指标、估值水平、财报质量
- Sentiment Analyst：聚合新闻标题、StockTwits、Reddit情绪——量化"市场情绪温度"
- News Analyst：监控全球新闻和宏观经济事件，解读对市场的冲击
- Technical Analyst：MACD、RSI等技术指标分析，识别交易模式和价格趋势

**Researcher Team（结构化辩论）**：
- 看涨研究员（Bull Researcher）：从Analyst Team的数据中提取利好因素
- 看跌研究员（Bear Researcher）：同样数据中提取利空因素
- 两方辩论max_debate_rounds轮（默认2轮），形成平衡的风险-收益评估

**Trader Agent**：综合Analyst和Researcher的所有报告，制定交易方案（方向、时机、仓位）

**Risk Management + Portfolio Manager**：
- 风险管理团队评估当前持仓风险、市场波动率、流动性
- Portfolio Manager审批或拒绝交易提案——只有通过风控的交易才会执行

**持久化与恢复机制**：
- **Decision Log**：每次运行自动追加决策到`~/.tradingagents/memory/trading_memory.md`，下次分析同一ticker时会读取历史决策和反思教训
- **Checkpoint Resume**：LangGraph checkpoint机制，中断后从最后成功步骤恢复而非重跑

**多模型支持矩阵**（v0.2.5覆盖）：

| Provider | 模型 | 用途 |
|----------|------|------|
| OpenAI | GPT-5.5, GPT-5.4-mini | 深度推理/快速任务 |
| Anthropic | Claude Opus/Sonnet 4.x | 分析/辩论 |
| Google | Gemini 3.1 Pro | 多模态分析 |
| xAI | Grok 4.x | 实时新闻解读 |
| DeepSeek | DeepSeek v4 | 低成本推理 |
| Qwen/GLM/MiniMax | 双区域(国际+中国) | 中国市场 |
| Ollama | 本地模型 | 零成本实验 |

**5分钟快速上手**

安装：

```bash
git clone https://github.com/TauricResearch/TradingAgents.git
cd TradingAgents
conda create -n tradingagents python=3.13
conda activate tradingagents
pip install .

# 配置API Key
export OPENAI_API_KEY=your-key
export ALPHA_VANTAGE_API_KEY=your-key  # 市场数据源
```

CLI交互模式：

```bash
tradingagents  # 启动交互CLI，选择ticker、日期、模型、研究深度
```

Python SDK——一行代码启动分析：

```python
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG

# 默认配置
ta = TradingAgentsGraph(debug=True, config=DEFAULT_CONFIG.copy())
_, decision = ta.propagate("NVDA", "2026-01-15")
print(decision)
```

自定义配置——选择模型和辩论轮数：

```python
config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "openai"
config["deep_think_llm"] = "gpt-5.5"        # 深度推理用强模型
config["quick_think_llm"] = "gpt-5.4-mini"  # 快速任务用轻模型
config["max_debate_rounds"] = 3              # 更深入的辩论
config["checkpoint_enabled"] = True          # 启用checkpoint恢复

ta = TradingAgentsGraph(debug=True, config=config)
_, decision = ta.propagate("AAPL", "2026-06-01")
```

Docker部署：

```bash
cp .env.example .env  # 填入API keys
docker compose run --rm tradingagents

# 本地模型(Ollama)
docker compose --profile ollama run --rm tradingagents-ollama
```

**真实场景实战**

场景1：美股科技股分析。分析NVDA的买入时机：

```python
_, decision = ta.propagate("NVDA", "2026-06-01")
# Agent流程：
# 1. Fundamentals Analyst提取财报数据（营收增长率、毛利率）
# 2. Sentiment Analyst抓取Reddit/StockTwits情绪
# 3. Technical Analyst计算MACD/RSI信号
# 4. Bull vs Bear辩论3轮
# 5. Trader决策：BUY/SELL/HOLD + 仓位建议
# 6. Risk Manager评估止损位
# 7. Portfolio Manager最终审批
```

场景2：A股白酒龙头分析。使用Qwen中国区域模型：

```python
config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "qwen-cn"  # 阿里云DashScope中国节点
config["deep_think_llm"] = "qwen-max"
_, decision = ta.propagate("600519.SS", "2026-06-01")  # 贵州茅台
```

场景3：回测+反思循环。连续分析多天，积累决策记忆：

```python
dates = ["2026-05-01", "2026-05-08", "2026-05-15", "2026-05-22"]
for date in dates:
    _, decision = ta.propagate("SPY", date)
    # 每次运行自动追加到Decision Log
    # 下次分析时读取历史决策和实盘收益，反思改进
```

**选型对比表**

| 方案 | Agent协作 | 辩论机制 | 风控层 |
|------|-----------|----------|--------|
| TradingAgents | 多角色分工 | 看涨vs看跌 | 独立风控+PM |
| FinceptTerminal | 单Agent分析 | 无 | 基础止损 |
| 传统量化(Python) | 无 | 无 | 手写规则 |
| AutoGPT金融版 | 单Agent自主 | 无 | 无 |

**学习路线**

1. **入门**：pip安装 → CLI运行第一次分析 → 理解Analyst/Researcher/Trader/Risk四个层级
2. **进阶**：自定义模型配置 → 调整辩论轮数和温度 → 读取Decision Log查看历史反思 → Checkpoint恢复中断任务
3. **生产**：Docker部署 → 多ticker并行分析 → 接入实盘数据源 → 配合FinceptTerminal做可视化
4. **深度**：研究LangGraph编排逻辑 → 贡献新Analyst角色 → 开发中国市场专属模板 → 参与学术论文讨论

**来源**

- GitHub: https://github.com/TauricResearch/TradingAgents (84.7k Stars)
- 论文: https://arxiv.org/abs/2412.20138
- 官网: https://tauric.ai

---

*本文数据采集时间：2026-06-09。Star数等动态数据可能随时间变化，建议访问GitHub项目页面获取最新数据。*