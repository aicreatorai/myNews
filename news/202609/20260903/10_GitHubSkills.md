# GitHubSkills

> **生成日期**：2026-09-03 | **搜索时段**：近 7–30 天

> **总条数**：6 条

---

### 1. 【Mem0：给 AI Agent 装上一层会进化的长期记忆】

> 📍 **导语**：Mem0 是 mem0ai 开源的"记忆层"框架，专门解决 AI Agent 跨会话遗忘、无法记住用户偏好的老问题。它把对话抽取成结构化记忆并持续融合去重，让 Agent 像人一样拥有长期记忆与个性化能力，在 LoCoMo 基准上把准确率提升到 92.5%，明显超过原生 RAG 方案，已成为构建有状态 Agent 的热门基础设施。

---

**🧠 深度解析**

**▌ 它是什么**：Mem0（发音 memory-zero）是一个面向 AI 应用的开源记忆层，以 Apache-2.0 协议托管在 github.com/mem0ai/mem0，截至 2026 年 9 月星标约 6 万。它提供统一的记忆接口，可挂载在任意 LLM 应用或 Agent 之上，把对话历史、用户事实和偏好沉淀为可检索的长期记忆。其核心主张是"记忆不是把文档堆进向量库，而是不断合并演化的知识图谱式状态"，官方把这种状态称为 Graph Memory，支持本地与云端两种部署模式，并可与 OpenAI、Ollama 等多种模型后端以及 Qdrant、Chroma 等向量库对接，开发者不需要自己从零造一套记忆系统即可获得跨会话记忆能力。

**▌ 解决什么**：传统 RAG 把整段聊天塞进向量库，检索噪声大、上下文易溢出，且同一事实更新后旧值仍残留。Mem0 要解决三件事：一是跨会话记住用户，例如"我喜欢清淡口味"；二是事实冲突时自动更新，如用户搬家后地址变更旧值应被覆盖；三是多 Agent 协作时共享统一记忆，避免每个 Agent 各记一份导致状态分裂。它把"记忆管理"从工程包袱变成一行 API 调用，让个性化 Agent 的搭建成本大幅下降，也让客服、陪伴、教育等需要长期陪伴的场景真正能"记得你"，而不是每次都从零开始寒暄，显著提升用户体验与连贯性。

**▌ 原理拆解**：Mem0 的流水线分抽取、融合、检索三段。抽取阶段用 LLM 把对话解析成 MEMORY 类型的 JSON 列表，每条含事件、事实、用户偏好等字段。融合阶段是关键：新记忆与既有记忆先做 multi-signal retrieval（语义向量 + 关键词 + 时间）匹配，若命中则分类为 ADD / UPDATE / DELETE / NOOP——例如用户改地址触发 UPDATE 覆盖旧值，矛盾陈述触发 DELETE，完全不相关的闲聊则标 NOOP 跳过。检索阶段按 query 召回并叠加 temporal reasoning（时间推理），用时间戳排序保证最新事实优先，避免把过期信息喂给模型。2026 年 4 月发布的 Memory Algorithm 在 LoCoMo 达到 92.5 分、LongMemEval 94.4 分，靠的就是"记忆演化 + 时间权重"而非单纯向量相似度。部署上支持本地与云端托管两种模式，云端提供 /v1/memories REST 接口与 Python/JS SDK，本地可用 mem0[graph] 跑图记忆，开发者还能接自定义 LLM 与向量库后端，适配自有技术栈，并可通过 category 给记忆打标签做分层管理，把"用户偏好""任务进度""世界知识"分开维护，检索时按需取用。

**▌ 动手验证**：pip install mem0ai 后，from mem0 import Memory；配置 OpenAI key，调用 memory.add("用户叫小林，讨厌香菜", user_id="x") 写入记忆，再 memory.search("小林的饮食偏好", user_id="x") 即可召回结构化记忆。当你重说"小林爱吃香菜"时，观察旧记忆被自动 DELETE、新记忆 UPDATE，验证融合逻辑确实生效，整个过程无需手写去重代码，接入成本极低。

**▌ 对比与选型**：在实际选型时，应把 Mem0 与"无记忆 RAG""Zep"等方案做区分，关注记忆是否会随对话自动演化：

| 对比维度 | Mem0 | 原生 RAG | Zep |
| --- | --- | --- | --- |
| 记忆演化 | 自动 ADD/UPDATE/DELETE | 仅追加 | 图时间线 |
| 跨会话个性化 | 强 | 弱 | 中 |
| 部署形态 | 本地/云 | 本地库 | 云服务 |

🔗 **信息来源**：GitHub mem0ai/mem0（2026-09-02 提交） / dev.co/ai/frameworks/mem0（2026-07） / mem0.ai 官方文档（2026）

---

### 2. 【Crawl4AI：把任意网页一键转成 LLM 友好的 Markdown】

> 📍 **导语**：Crawl4AI 是 unclecode 开源、专为 LLM 与 Agent 设计的异步爬虫，能把任意网页一键变成干净 Markdown。它用 BM25 与智能剪枝过滤广告导航，支持自适应爬取与 JS 渲染，号称比传统爬虫更省 token、更贴合 RAG 管线，星标已超 6.8 万，是当前 AI 数据摄取层最受欢迎的开源选择之一。

---

**🧠 深度解析**

**▌ 它是什么**：Crawl4AI（github.com/unclecode/crawl4ai，Apache-2.0）是一个异步网页抓取与 Markdown 转换框架，2026 年 7 月发布 v0.9.2。它把 Playwright 内核封装成 AsyncWebCrawler，输入 URL 即可输出 LLM 友好的 Markdown、结构化 JSON 和截图。其定位是"RAG 与 Agent 的数据摄取层"，强调零配置、可自托管、支持本地与云端双模式，避免把整页 HTML 噪声直接喂给模型，从源头降低 token 成本与检索噪声，让"网页到向量库"的链路变得开箱即用。

**▌ 解决什么**：通用爬虫给的是原始 HTML，含导航、脚本、广告，直接进上下文既贵又噪。Crawl4AI 解决：一、把正文提纯为 Markdown，剔除样板；二、按 BM25 与剪枝算法去掉无关区块；三、对动态站支持 JS 渲染与懒加载；四、提供自适应爬取（AdaptiveCrawler）按语义自动决定抓哪些链接，省去手写 sitemap；五、输出可直接 chunk 进向量库，打通从网页到向量的最后一公里，让搭建 RAG 不再卡在数据清洗，研究者能把精力放在检索与生成质量而非爬虫维护上。

**▌ 原理拆解**：核心流程是调度器拿到 URL 后启动无头浏览器获取 DOM，Markdown 生成器用基于分数的内容提取（类似 readability 但面向 token 成本）把正文转 Markdown，同时保留代码块与表格。过滤链由 BM25 过滤器与 pruning filter 组成——前者按查询相关度打分保留高权区块，后者基于文本密度剪掉低信息行。自适应爬取模块用 LLM 生成"抓取指令"，对站内链接做语义打分决定跟进深度，实现"抓到够用就停"。架构上支持并发、钩子（hook）在抓取前后注入自定义逻辑、以及多格式输出（md/json/截图）。因为是异步且可复用浏览器实例，批量抓取吞吐显著高于同步方案，文档称单批可并行数十页，并内置缓存避免重复下载，对定期抓取的新闻站与文档站尤其友好。它还能通过 fit_markdown 输出"只保留与查询相关句子"的精简版，进一步压缩进模型前的 token 占用，是 RAG 数据质量的加分项。在工程实践上，Crawl4AI 的钩子机制允许在页面加载后、抽取前注入自定义 JS，例如展开折叠区、等待轮播停止，从而抓到人类肉眼可见的完整内容；配合缓存目录，二次抓取同一站点可直接读盘，既省流量又降低被封风险，是长期运维型 RAG 的务实选择。

**▌ 动手验证**：pip install crawl4ai 后运行 crawl4ai-setup 安装浏览器；from crawl4ai import AsyncWebCrawler；async with AsyncWebCrawler() as c: r = await c.arun("https://example.com")；print(r.markdown) 即可拿到纯净正文，把 enable_media=True 传入还能顺带抽取图片与链接，几行代码完成一个 RAG 数据源接入，无需自己写清洗规则。进一步可开启 enable_media 抽图片、用 cache_mode 启用缓存，把整站变成可增量更新的知识库，实战中几分钟即可喂饱一个垂直领域 RAG，是低成本搭建检索增强应用的捷径。

**▌ 对比与选型**：在给 Agent 配数据摄取层时，Crawl4AI 与原生爬虫、托管 API 的差异主要体现在面向 LLM 的友好度与可自托管性：

| 对比维度 | Crawl4AI | FireCrawl | Scrapy |
| --- | --- | --- | --- |
| 面向 LLM | 原生 Markdown | API 托管 | 通用 HTML |
| 自托管 | 开源可自托管 | 闭源 SaaS | 需自搭 |
| 动态渲染 | 内置无头浏览器 | 云端渲染 | 需配置 |

🔗 **信息来源**：GitHub unclecode/crawl4ai（2026-07-15 v0.9.2） / crawl4ai.com 官方文档（2026） / aibars.net 仓库统计（2026-08-29，约 8 万星）

---

### 3. 【E2B：用 Firecracker 微虚拟机给 AI 跑代码上沙箱】

> 📍 **导语**：E2B 是 e2b-dev 开源的云端代码执行沙箱，用 Firecracker 微虚拟机给 AI 跑任意代码隔离出安全环境。它提供 Python/JS SDK 与"代码解释器"API，让 Agent 像调用函数一样执行用户代码、画图表、跑数据分析而不污染主机，被多款 Agent 框架选作默认沙箱，星标约 1.3 万。

---

**🧠 深度解析**

**▌ 它是什么**：E2B（github.com/e2b-dev/E2B，Apache-2.0）是一个面向 AI 应用的云代码执行平台，核心是运行在 Firecracker 微虚拟机里的沙箱。2026 年 6 月发布 e2b 2.31.0。开发者通过 pip install e2b-code-interpreter 即可拿到 CodeInterpreter，上传文件、执行 Python、取回图表与 stdout，本质是把"Jupyter 内核"变成可被 Agent 远程调用的安全服务，让任何 LLM 应用都能拥有"会跑代码的手"，而不必担心把危险代码跑在本机环境里。

**▌ 解决什么**：Agent 直接在本机执行 LLM 生成的代码极度危险，可能删库、读密钥、跑恶意脚本。E2B 解决：一、隔离——每个会话是独立微虚拟机，崩了也不影响宿主；二、短时——沙箱默认数十秒生命周期、用完即焚；三、近原生速度——Firecracker 启动毫秒级，比容器更轻；四、可流式拿结果——stdout、图表、文件都能回传；五、多语言——Python/JS 双 SDK，适配各类 Agent 栈，让代码执行成为可控能力而非安全隐患，数据分析、绘图、文件处理都能放心交给模型去试。

**▌ 原理拆解**：底层用 Firecracker（AWS 开源的 KVM 微虚拟机监视器）启动极小的 VM，每个 VM 只跑一个精简内核与受控运行时，资源用 cgroup 限额。E2B 控制面负责调度沙箱、注入代码、转发 IO。Code Interpreter 在 VM 内起一个长驻 Python 内核，execute_code 把片段送进去跑，通过 WebSocket 把 stdout、stderr、生成文件流式回传。因为 VM 与宿主共享内核态隔离，启动开销远低于完整虚拟机，官方称冷启动在百毫秒内。安全上默认无外网或白名单出网、禁止特权系统调用，配合短时生命周期把"代码执行爆炸半径"压到最小。部署可选 E2B 托管云或自托管（开源版），自托管适合数据敏感场景，也可把沙箱接到自己的对象存储做数据持久化。相比容器沙箱，微虚拟机在密度与隔离强度之间取得更好平衡，是生产级 Agent 执行代码的优选底座。在资源计量上，E2B 按沙箱存活时长与 CPU/内存用量计费，闲置自动回收；开源版可部署在自有 Kubernetes 集群，配合自定义镜像预装数据分析库，让冷启动后的首跑即可直接 import 业务依赖，进一步缩短 Agent 响应延迟。它还提供文件系统与网络的可观测接口，便于审计 Agent 到底读了哪些数据、发了哪些请求，满足企业合规对"代码执行可追溯"的要求，这也是它被多款生产级 Agent 框架默认采用的重要原因。

**▌ 动手验证**：pip install e2b-code-interpreter 并设 E2B_API_KEY；from e2b_code_interpreter import Sandbox；s = Sandbox()；r = s.run_code("import matplotlib; print('ok')")；print(r.text, r.results) 即可看到远程执行结果，s.files.write 还能往沙箱塞数据再跑，完整模拟"Agent 跑数据分析"的闭环，且不碰本机任何文件。还可用 s.commands.run 跑 shell、s.files.read 取结果，把"让 Agent 执行命令并回传产物"的完整闭环跑通，直观验证微虚拟机沙箱隔离确实生效、危险代码出不去沙箱边界。

**▌ 对比与选型**：选代码沙箱时要权衡隔离强度、启动速度与可移植性，三者的取舍如下：

| 对比维度 | E2B | Docker | Pyodide |
| --- | --- | --- | --- |
| 隔离强度 | 微虚拟机 | 容器 | 浏览器内 |
| 启动速度 | 百毫秒 | 秒级 | 即时 |
| 适用场景 | 云端 Agent | 自管服务 | 前端内联 |

🔗 **信息来源**：GitHub e2b-dev/E2B（2026-06-25 v2.31.0） / reporank.net 仓库统计（2026-09-02，约 1.36 万星） / dev.co/ai/frameworks/e2b（2026）

---

### 4. 【DSPy：用声明式编程让提示词可优化可迭代】

> 📍 **导语**：DSPy 是斯坦福开源的"声明式、可自改进"LM 编程框架，把提示词从手写字符串变成可优化的 Python 模块。你只声明输入输出签名，优化器自动跑少样本与指令搜索，在多项基准上超过手调提示。它让"提示工程"升级为"LM 编程"，星标约 3.5 万，是 agentic 评测与教学常用栈。

---

**🧠 深度解析**

**▌ 它是什么**：DSPy（github.com/stanfordnlp/dspy，MIT）全称 Declarative Self-improving Python，是斯坦福 HAI 出品的 LM 编程框架。最新 3.3.0b1 把"写提示"抽象成 Signatures（声明任务输入输出）、Modules（编排步骤）、Optimizers（自动调参）三层。你不再拼字符串，而是写 signature="question -> answer" 让框架补提示，逻辑与提示解耦，代码可读、可测试、可复用，像写普通 Python 一样构建 LM 流水线，把"调提示"变成"写程序"，对工程团队更友好。

**▌ 解决什么**：手调提示脆弱：换模型就崩、加一步就乱、难评估。DSPy 解决：一、声明式——只说要什么，不说怎么问；二、可优化——优化器用少量样本自动搜最佳指令与 few-shot；三、可组合——多模块串成管道（检索→生成→校验）；四、可评估——内置 metric 与引导式轨迹；五、跨模型——同一签名换 backend 无需重写提示，降低供应商锁定，让实验从"改提示碰运气"变成"跑优化器看指标"，把提示工程真正工程化、可复现、可版本管理。

**▌ 原理拆解**：三个核心抽象。Signatures 用类型注解描述"输入字段 -> 输出字段"，DSPy 据此生成初始提示；Modules 如 ChainOfThought、Retrieve 把签名包成可调用单元，内部用 LM 生成。关键是 Optimizers（原 Teleprompter）：以 BootstrapFewShot 为例，它先用少量训练样本让 LM 跑出带正确输出的轨迹，再把这些轨迹抽成 demos 注入后续提示；更先进的 GEPA 优化器用"反思式进化"在验证集上迭代改进指令与示例，论文显示比早期 MIPROv2 在多项任务上平均提升 5–10 个点。整个过程不碰模型权重，只优化"喂给模型的提示与样本"，因此任何黑盒 LLM 都能用。管道可串 RAG、工具调用，配合 LM 评估函数做自动回归测试。由于提示是程序生成而非手写，换底座模型时只要重新跑优化器即可重新适配，避免了"提示迁移"的人工返工，这也是它在研究中被广泛采用的根本原因。在工程落地上，DSPy 还提供 dspy.evaluate 与引导式轨迹回放，能把一次优化过程完整记录为可复现实验，配合 mlflow 等做版本管理；当底座模型升级或训练集扩充时，只需重跑 optimizer 即可重新拿到适配的新提示，无需人工逐条重写。社区还维护大量可直接复用的 Module 与 Optimizer 配方，新手也能在数十行内搭出一条带自动评估的 LM 管道，把"提示工程"真正沉淀为团队资产。

**▌ 动手验证**：pip install dspy-ai；import dspy；lm = dspy.LM("openai/gpt-4o-mini")；dspy.configure(lm=lm)；sig = dspy.Signature("context, question -> answer")；prog = dspy.Predict(sig)；r = prog(context="...", question="...")；print(r.answer)，再接 BootstrapFewShot 用几十条例子优化即可看到效果提升，验证"声明式 + 自动优化"的真实收益。再换 dspy.LM("anthropic/claude") 重跑同一签名，观察无需改写提示即可适配新模型，直观体会声明式编程带来的可移植性收益，这也是它区别于手写提示串的核心价值。

**▌ 对比与选型**：在做 LM 编程栈选型时，应关注"提示是否可自动优化、能否跨模型迁移"：

| 对比维度 | DSPy | LangChain | 手写提示 |
| --- | --- | --- | --- |
| 提示优化 | 自动优化器 | 手动 | 手动 |
| 跨模型迁移 | 签名复用 | 需改链 | 需重写 |
| 抽象层级 | 声明式 | 链式 | 字符串 |

🔗 **信息来源**：GitHub stanfordnlp/dspy（2026-05-31 提交） / dspy.ai 官方文档（2026） / hai.stanford.edu 研究页（2026）

---

### 5. 【Instructor：用 Pydantic 模型让大模型稳定吐结构化 JSON】

> 📍 **导语**：Instructor 是 567-labs 开源、用 Pydantic 模型约束大模型输出的库，让 LLM 稳定吐出可校验的结构化 JSON。它在大模型调用外层包一层 response_model，自动做 schema 校验与失败重试，支持 OpenAI/Anthropic/Gemini 等多后端，被大量生产服务用来替代脆弱的手动 JSON 解析，星标约 1.2 万。

---

**🧠 深度解析**

**▌ 它是什么**：Instructor（github.com/567-labs/instructor，MIT）是一个"让 LLM 输出结构化数据"的轻量库，最新 v1.15.4（2026-06）。它不改模型，而是在你调用 OpenAI/Anthropic 等 SDK 时加一层：用 Pydantic 的 BaseModel 当 response_model，框架把模型返回强转成对象并校验字段类型。一句话，把"希望模型返回 JSON"变成"模型保证返回对象"，让下游代码像用普通 Python 对象一样消费模型结果，彻底告别正则抠 JSON 的脆弱写法。

**▌ 解决什么**：让 LLM 返回 JSON 常遇三难：字段缺失、类型错（字符串当数字）、格式崩（多逗号）。Instructor 解决：一、结构保证——Pydantic 校验失败即抛错；二、自动重试——validation 不过时带错误信息重回模型重生成；三、多后端——同一套模型定义跨 OpenAI/Anthropic/Gemini/LiteLLM；四、流式——支持流式吐对象与 partial；五、可嵌套——模型里套模型、数组里套对象，覆盖复杂抽取场景，把"解析大模型输出"从正则地狱变成类型安全调用，显著降低生产服务的解析失败率。

**▌ 原理拆解**：机制分三层。第一层是 schema 注入：Instructor 把 Pydantic 模型编译成 JSON Schema，塞进模型的 response_format（如 OpenAI 的 structured outputs）或系统提示，引导模型按 schema 生成。第二层是解析与校验：拿到原始响应后用 Pydantic 实例化，逐字段比对类型、必填、默认值；若失败，框架构造带"哪里错了"的修正提示回到模型（retry 策略默认若干次）。第三层是模式兼容：对不支持原生 structured outputs 的后端，退化为 few-shot + 严格解析；对支持的后端则走原生函数调用，准确率高且零重试。额外提供 from_attributes、validation_context 等钩子做数据清洗，以及 async/streaming 接口。因为是薄封装，接入成本极低，import instructor 包一层 client 即可，对已有 OpenAI 调用几乎零改动。它还能配合 enum 限定取值、用 Field 写字段描述辅助模型理解，复杂表单抽取也能几行定义搞定，是生产环境里最省心的结构化输出方案之一。在真实业务里，Instructor 常被用来做表单抽取、工单结构化、日志解析等任务，配合 Pydantic 的 validator 还能在入库前做业务校验，例如把"金额"字段约束为正数、把"日期"规整成标准格式。它也支持把模型输出直接落库为 ORM 对象，或用十行代码搭一个"自然语言转结构化查询"的接口。由于校验失败会带回模型自动重生成，线上解析失败率通常能从手写 JSON 的个位数百分比降到接近零，是替代脆弱正则解析的最稳妥方案，也是多数生产服务落地结构化输出的首选。

**▌ 动手验证**：pip install instructor；import instructor, openai；client = instructor.from_openai(openai.OpenAI())；class User(BaseModel): name: str; age: int；u = client.chat.completions.create(model="gpt-4o", response_model=User, messages=[{"role":"user","content":"小林 28 岁"}])；print(u.name, u.age)，类型错时自动重试修正，验证"模型输出即对象"的可靠性，下游直接用属性而非字典。

**▌ 对比与选型**：在结构化输出方案里，核心差异在"是否内置校验与重试、是否跨厂商"：

| 对比维度 | Instructor | 原生 JSON 模式 | Outlines |
| --- | --- | --- | --- |
| 校验重试 | 内置 Pydantic | 无 | 有 |
| 多后端 | 跨厂商 | 单厂商 | 本地为主 |
| 接入成本 | 薄封装 | 原生 | 需本地推理 |

🔗 **信息来源**：GitHub 567-labs/instructor（2026-07-13 提交） / claudeskills.info 使用指南（2026） / jacar.es 技术测评（2026）

---

### 6. 【Guidance：用模板语言把大模型生成过程牢牢控住】

> 📍 **导语**：Guidance 是微软开源、用模板语言精确控制大模型生成的库。它把提示写成 Handlebars 风格模板，用 {{gen}}、{{select}} 等标签约束输出路径，配合正则与上下文无关文法做"受控生成"，还能 token healing 修边界错误。相比后处理校验，它在生成时就锁死格式，速度更快更稳，是研究与原型常用控件。

---

**🧠 深度解析**

**▌ 它是什么**：Guidance（github.com/microsoft/guidance，现 markwallace-microsoft 维护）是微软出品的受控生成模板语言，语法类似 Handlebars。你在模板里混写自然语言与控件：{{gen}} 触发生成、{{select}} 限定从候选中选、{{#if}} 做分支。它不依赖特定模型，可在本地 transformers 或 OpenAI 上运行，定位是"在生成过程中（而非生成后）约束 LLM"，把提示变成一段可执行程序而非一段静态字符串，让复杂生成流程能被精确编排与复用。

**▌ 解决什么**：后处理校验（如 Instructor）是"生成完再改"，浪费 token 且可能反复重试。Guidance 解决：一、生成时约束——用 regex/CFG 把输出锁在合法集合；二、少 token——只生成需要的部分，模板静态文本不进模型；三、可控流——根据中间结果走不同分支；四、token healing——修"生成切在词中间"的错位；五、可组合——模板能嵌套、循环，写复杂 agent 流程，让"控制生成"从外部补丁变成内建能力，显著降低失败率与延迟，特别适合需要严格输出 schema 的抽取与决策任务。

**▌ 原理拆解**：核心是把"提示 + 生成"当成一个程序。模板编译后，静态文本直接作为上下文前缀，遇到 {{gen}} 时调用 LM 续写，遇到 {{select options=["A","B"]}} 时把候选分别拼到前缀做一次前向、取概率最高者（避免重复解码）。受控生成靠 regex 约束：每生成一个 token 就用正则过滤词表、只允许合法续写，实现"强制 JSON 字段名、限数字范围"。CFG 模式支持完整上下文无关文法，能生成任意结构化语言。token healing 则在 {{gen}} 起点把"被切半的词"回退一个 token 再生成，消除子词错位导致的格式漂移。因为静态文本不重复送模型、且约束在前向阶段剪枝词表，官方称其比反复调用 + 后校验快数倍。文档示例用 {{#each}} 循环批量抽取实体，展示"模板即流程"的写法，复杂抽取也能几行表达清楚。它还能把变量、函数、条件分支组合进模板，使"提示"第一次具备真正的编程表达能力。在生产落地上，Guidance 的受控生成特别适合需要严格 schema 的合规场景，例如把模型输出限定在受控词表内以杜绝幻觉越界；其与本地模型配合时因省去重复往返、且在前向阶段就剪枝词表，延迟优势更明显，是边缘侧 Agent 控制生成的优选。社区也围绕它沉淀了大量可复用模板，从实体抽取到决策树编排都能直接套用，显著降低"可控生成"的入门门槛。

**▌ 动手验证**：pip install guidance；import guidance；g = guidance.models.OpenAI("gpt-4o")；t = guidance("名字：{{gen 'name'}}，类型：{{select 'type' options=['人','机构']}}")；r = t()；print(r['name'], r['type'])，即可看到生成被模板与候选严格控住，没有多余字段或格式漂移，改 options 就能改可选空间。

**▌ 对比与选型**：受控生成库的差别主要在"约束发生在生成时还是生成后、语法形态"：

| 对比维度 | Guidance | Instructor | LMQL |
| --- | --- | --- | --- |
| 约束时机 | 生成时 | 生成后 | 生成时 |
| 语法形态 | 模板语言 | 装饰器 | 查询语言 |
| 跨模型 | 本地/云皆可 | 多厂商 | 本地为主 |

🔗 **信息来源**：GitHub markwallace-microsoft/guidance（2026） / seeai.work 控制生成教程（2026） / awesome-repositories.com 仓库页（2026）
