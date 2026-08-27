# 10_GitHubSkills · 2026-08-28

> 本模块聚焦 GitHub 上热门的开发者工具与开源项目，每日固定 6 条，每条含「导语 / 它是什么 / 它解决了什么问题 / 原理拆解 / 动手验证 / 对比选型 / 来源」七块结构，面向希望动手实践的一线工程师。今日选题均通过 `scripts/check-dedup.py` 去重检测，且与昨日（vLLM/Dify/Milvus/AutoGen/Open WebUI/Bun）及近五日模块 10 历史选题无撞车。

---

### 1. 【SGLang：用 RadixAttention 把多轮对话与 Few-shot 前缀缓存到极致的推理框架】

**导语**
当你用 vLLM 跑一个「系统提示很长 + 多轮对话 + 批处理里大量相似前缀」的场景时，会发现即使显存还有富余，吞吐也上不去——因为相同的前缀被反复计算。SGLang 正是冲着这个痛点来的：它的核心 RadixAttention 把请求之间共享的提示前缀像「公共前缀树」一样复用，已在社区里被大量用于高并发、长系统提示、结构化生成的线上服务，是继 vLLM 之后最受关注的高吞吐推理框架之一，被多家公司用于生产环境。

**它是什么**
SGLang 是由斯坦福团队发起、现由社区与企业共同维护的高性能大语言模型推理与服务框架，采用 Apache 2.0 许可证。它对外提供与 OpenAI 兼容的 API（`/v1/chat/completions` 等），同时自带一套「结构化生成」前端语言：用 Python 装饰器把提示词拼装、约束解码、并行采样写成可复用函数。最新版本持续迭代，在官方基准里对「共享前缀 + 多轮」类负载的吞吐往往优于朴素推理数倍。它被社区视为 vLLM 在「前缀缓存深度优化」方向上的强力互补与替代选项。

**它解决了什么问题**
核心痛点是「前缀冗余计算」与「结构化输出难」。在真实业务里，一个客服助手可能给所有用户挂同一段几千 token 的系统提示；一批请求可能共享同一份 few-shot 示例；多轮对话里历史轮次反复出现。传统框架每来一个请求都从头算 KV，GPU 算力被白白浪费在重复前缀上。同时，要让模型稳定吐出 JSON、SQL、函数调用这类结构化结果，往往需要一堆后处理与重试。SGLang 让相同前缀只算一次、并原生支持约束解码，直接把这类负载的 GPU 利用率与延迟表现拉满，也省掉了大量脆弱的后处理代码。

**原理拆解**
SGLang 的灵魂是 RadixAttention——它把一批请求共享的提示前缀组织成一棵基数树（radix tree），树节点缓存对应的 KV Cache，新请求到来时先沿树查找能复用的最长前缀，只计算差异部分。这比 vLLM 的线性页表更进一步：不仅省显存，更省重复算力，对「长系统提示 + 多租户」场景尤为显著。在此之上叠加：连续批处理（Continuous Batching）让请求即来即走；约束解码（constrained decoding）通过文法/正则把生成限制在合法 JSON/SQL 空间；前端 `sglang`  DSL 用 `@sgl.function` 把「系统提示 + 用户问题 + 受控生成 + 后处理」写成一个流程图，配合 `sgl.gen / sgl.select / sgl.fork` 等原语做分支与并行采样。服务层 `python -m sglang.launch_server` 与 vLLM 类似，可设 `--tp`（张量并行）、`--attention-backend` 等，并暴露 OpenAI 兼容端点，便于把现有调用方无缝迁移过来。

**动手验证**
下面这段可直接验证 SGLang 的部署与结构化生成能力，亲自动手跑通才算掌握。先安装并启动服务：
```bash
pip install "sglang[all]"
python -m sglang.launch_server \
  --model-path Qwen/Qwen2.5-7B-Instruct \
  --port 30000 --host 0.0.0.0
```
另开终端用 OpenAI 兼容接口发请求，验证前缀缓存链路：
```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen2.5-7B-Instruct",
       "messages":[{"role":"user","content":"用一句话解释 RadixAttention"}]}'
```
若返回 JSON 含 `choices[0].message.content`，即验证服务可用。再用它的 Python DSL 验证「约束解码 + 复用前缀」：
```python
import sglang as sgl

@sgl.function(model="Qwen/Qwen2.5-7B-Instruct")
def extract(s, text):
    s += "从下面文本抽取(name,age)的 JSON：" + text
    s += sgl.gen("answer", max_tokens=256,
                 regex=r'\{"name": "[^"]*", "age": [0-9]+\}')

out = extract.run(text="张三今年28岁，是一名工程师")
print(out["answer"])   # 直接吐出合规 JSON，无需后处理
```
当你把同一个长系统提示塞进成百上千请求时，观察吞吐相对「每请求重算前缀」的基线明显抬升，即可直观体会 RadixAttention 的收益。

**对比选型**
与 vLLM、TGI、TensorRT-LLM 相比：vLLM 胜在生态全、模型覆盖广、社区最大；SGLang 胜在「前缀树缓存 + 约束解码 + 结构化生成 DSL」这种针对高复用前缀与结构化输出的深度优化，在长系统提示、多轮、批量 few-shot 场景里常更省算力。若你的负载以「每个请求都独立、前缀不共享」为主，两者差距不大，选 vLLM 更稳；若你做的是「统一系统提示 + 海量相似请求 + 要稳定 JSON/SQL」，SGLang 的 RadixAttention 会立刻变现为更低的卡数与更薄的账单。TGI/TensorRT-LLM 则分别在 HF 生态与 NVIDIA 极致性能上各有侧重。一句话：不想踩坑要 vLLM，前缀复用重、结构化输出多就上 SGLang。

🔗 **信息来源**：SGLang GitHub 官方仓库（github.com/sgl-project/sglang）2026-08 / SGLang 官方文档（docs.sglang.ai）2026-08 / 开源中国《2026 年值得关注的 20 个 GitHub AI 项目》（my.oschina.net）2026-08

---

### 2. 【llama.cpp：一块 CPU 和量化权重就能跑起大模型的端侧推理引擎】

**导语**
没有显卡、不想装 CUDA、只想在一台笔记本甚至树莓派上跑一个 7B 模型做本地问答或离线批处理？llama.cpp 用纯 C/C++ 把这件事做到了极致：它把模型转成 GGUF 格式、用整数量化把显存/内存压到原来的几分之一，再用 llama-server 暴露 OpenAI 兼容接口。作为本地推理的「底层事实标准」，它支撑了 Ollama、LM Studio 等众多上层工具，GitHub 星标已超 7 万，是端侧 AI 无可绕开的一块基石。

**它是什么**
llama.cpp 是由 Georgi Gerganov 发起、现由庞大社区维护的纯 C/C++ 大语言模型推理引擎，采用 MIT 许可证。它不依赖 PyTorch、不需要 GPU 驱动，支持 CPU（含 ARM NEON、Apple Silicon 的 Metal、x86 的 AVX）、GPU（CUDA、Metal、Vulkan、ROCm）等多种后端。模型需先转成 GGUF（一种自描述、可量化、可内存映射的权重格式），再用 `llama-cli`、`llama-server`、`llama-perplexity` 等命令行工具加载。上层生态（Ollama、LM Studio、web-ui）几乎都把它当推理内核，因此它的稳定性与速度直接决定了一大半本地 AI 产品的体验。

**它解决了什么问题**
核心痛点是「跑大模型必须高端 GPU + 重型框架」。原生 PyTorch 部署一个 7B 模型常需十几 GB 显存与一整套 Python 依赖，普通开发者根本跑不起；而很多隐私敏感、离线、边缘场景（内网问答、工控机、手机、嵌入式）又要求模型不出设备。llama.cpp 用 INT4/INT5/INT8 量化把模型体积与内存占用砍掉 3–4 倍，再用高度优化的矩阵内核在 CPU 上也能达到可用的 tok/s，让「人人都能在自家机器上跑模型」成为现实，也把推理从云厂商手里解放回本地。

**原理拆解**
llama.cpp 的关键在三层：其一，GGUF 权重格式——把分词器、超参、量化张量打包成可 mmap 的单文件，加载即内存映射、几乎零拷贝；其二，量化内核——用 Q4_K、Q5_K、Q8_0 等方案把权重从 FP16 压成 4/5/8 比特，配合 Metal/CUDA/Vulkan 的 kernel 在解码时现场反量化计算，显存占用大幅下降而精度损失可控；其三，高效解码循环——`llama_decode` 以 batch 方式做自回归生成，配合 KV Cache 与可选的 GPU 卸载（`-ngl` 把若干层放进显卡）。`llama-server` 在其上包了一层 HTTP 服务，暴露 `/v1/chat/completions` 等 OpenAI 兼容端点，于是任何能调 OpenAI 的客户端的代码都能直接指向本地。它的 Python 绑定 `llama_cpp` 则把同一引擎封装成 `Llama` 类，方便嵌进自有 Python 服务，而不必走 HTTP。

**动手验证**
动手验证最快是编译 + 起服务 + 用 OpenAI 兼容接口对话：
```bash
# 1. 编译（或用预编译 release）
git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp
cmake -B build -DGGML_METAL=ON && cmake --build build -j
# 2. 启动本地 OpenAI 兼容服务（模型需先转成 GGUF）
./build/bin/llama-server -m models/Qwen2.5-7B-Instruct-Q4_K_M.gguf \
  -c 4096 -ngl 99 -p 8080
# 3. 用 curl 验证
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"local","messages":[{"role":"user","content":"你好，自我介绍下"}]}'
```
若返回含 `choices[0].message.content`，即验证端侧推理链路打通。再用 Python 绑定验证「不依赖 HTTP、直接嵌代码」：
```python
from llama_cpp import Llama
llm = Llama(model_path="models/Qwen2.5-7B-Instruct-Q4_K_M.gguf",
            n_ctx=4096, n_gpu_layers=99)
out = llm.create_chat_completion(
    messages=[{"role":"user","content":"用一句话解释量化推理"}])
print(out["choices"][0]["message"]["content"])
```
把 `-ngl 0`（纯 CPU）与 `-ngl 99`（全卸载 GPU）各跑一次，对比 tok/s，就能直观体会 GPU 卸载的提速幅度。

**对比选型**
对比 Ollama（上层封装、体验好但黑盒）、vLLM（云端高并发、不主打端侧）、MLC-LLM（另一套端侧编译栈）：llama.cpp 的杀手锏是「极致轻量 + 后端最广 + 被生态广泛复用」，适合想要可控、可嵌入、能跑在奇怪硬件上的场景。若你只是终端用户想一键跑模型，Ollama 更省心；若你要做云端高并发 API，vLLM/SGLang 更合适；若你做的是 App 内嵌推理且追求最小体积与最宽硬件覆盖，llama.cpp 几乎是默认答案。对绝大多数「本地优先、离线优先、隐私优先」的需求，先试 llama.cpp，再决定要不要套一层 Ollama。

🔗 **信息来源**：llama.cpp GitHub 官方仓库（github.com/ggml-org/llama.cpp）2026-08 / llama.cpp README 与 GGUF 文档（github.com/ggml-org/llama.cpp#readme）2026-08 / Unsloth 提交的 llama.cpp qwen4exp 架构支持 PR #27742（github.com/ggml-org/llama.cpp）2026-08-26

---

### 3. 【Haystack：把 RAG 与 Agent 流水线拆成可拼装组件的 production 级框架】

**导语**
想做企业级 RAG，却不想被某个可视化平台的黑盒绑架，又嫌 LangChain 的抽象太碎、文档太散？Haystack 走了一条中间路线：它把「文档清洗、切分、检索、重排、生成、评估」都做成独立、可单元测试、可替换的组件，再用 `Pipeline` 把这些组件像水管一样串起来。它由 deepset 维护、采用 Apache 2.0，长期是生产环境 LLM 应用的主流选择之一，适合既要代码可控、又要工程化落地的团队。

**它是什么**
Haystack 是 deepset 开源的 LLM 应用与 RAG 编排框架，Apache 2.0 许可证，面向「生产可用」而非仅做 demo。2.x 版本确立了以组件（Component）和管道（Pipeline）为核心的架构：每个组件是一个有类型化输入输出的 Python 类（如 `InMemoryBM25Retriever`、`OpenAIGenerator`、`PromptBuilder`），管道负责把它们的数据流连起来。它同时支持关键词检索、向量检索、混合检索与重排，并内置评估、文档存储（InMemory / Elasticsearch / PGVector / Qdrant 等）集成，可以一路从原型走到线上服务。

**它解决了什么问题**
核心痛点是「RAG 原型好写、生产难养」。单独拼一个『读 PDF→切分→embedding→检索→填提示词→调模型』的脚本半天就能跑通，但一旦要换检索器、加重排、做评估、接真实向量库、处理增量更新，脚本就会迅速腐化成无法维护的一团。Haystack 把这些环节标准化成可替换组件：今天用 BM25 明天换向量检索，只要换一个组件；要评估召回质量，直接接它的 eval 模块。这让 RAG 从「一次性脚本」变成「可演进的系统」，也方便多人协作与回归测试。

**原理拆解**
Haystack 的核心是「组件 + 管道」的声明式编排。一个组件用 `@component` 装饰器定义，声明 `run` 方法的输入/输出类型；管道 `Pipeline()` 通过 `add_component` 注册、用 `connect("a.out", "b.in")` 把数据流式连起。典型 RAG 管道：文档写入 `InMemoryDocumentStore` → `InMemoryBM25Retriever` 或向量检索器取候选 → `PromptBuilder` 把问题与上下文拼成提示 → `OpenAIGenerator`（或任意 Generator）生成答案。各组件解耦意味着检索策略、模型、提示词都能独立替换与 A/B。文档侧支持 `UnstructuredFileConverter` 等把 PDF/HTML/Markdown 转成 `Document`；嵌入侧用 `SentenceTransformersDocumentEmbedder` 向量化；评估侧有 `FaithfulnessEvaluator`、`ContextRelevanceEvaluator` 等做「答案是否有据、上下文是否相关」。整条链路都可在代码里被单测与版本化，这正是它适合生产的根本原因。

**动手验证**
动手验证 Haystack 的「组件化 RAG」是否名副其实，可跑一段最小可运行脚本（需 `pip install haystack-ai`）：
```python
from haystack import Pipeline, Document
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.components.retrievers import InMemoryBM25Retriever
from haystack.components.builders import PromptBuilder
from haystack.components.generators import OpenAIGenerator

store = InMemoryDocumentStore()
store.write_documents([
    Document(content="SGLang 用 RadixAttention 复用共享前缀的 KV Cache。"),
    Document(content="llama.cpp 用 GGUF 量化让模型跑在 CPU 上。"),
])
retriever = InMemoryBM25Retriever(store, top_k=1)
prompt = PromptBuilder("根据上下文回答：{{question}}\n上下文：{{documents}}")
generator = OpenAIGenerator(model="gpt-4o-mini")

p = Pipeline()
p.add_component("retriever", retriever)
p.add_component("prompt", prompt)
p.add_component("llm", generator)
p.connect("retriever", "prompt.documents")
p.connect("prompt", "llm")

res = p.run({"retriever": {"query": "llama.cpp 怎么在端侧跑模型"},
             "prompt": {"question": "llama.cpp 怎么在端侧跑模型"}})
print(res["llm"]["replies"][0])
```
若打印出基于上下文的答案，即验证「检索→拼提示→生成」组件链路打通。把 `InMemoryBM25Retriever` 换成向量检索器并接 `SentenceTransformersDocumentEmbedder`，即可体会组件替换的零成本。

**对比选型**
对比 LangChain（抽象多、灵活但易乱）、LlamaIndex（数据/RAG 侧重强）、Dify（可视化、黑盒但省心）：Haystack 强在「组件可单测、管道可演进、生产导向明确」，适合工程团队要代码可控又不想要纯手写胶水。若你追求极致灵活与生态广度，LangChain 仍自由；若你的核心就是「把私有数据接进模型做检索」，LlamaIndex 更对口；若团队要可视化低代码协作，Dify 更顺手。Haystack 的甜区是「既要写代码、又要能长期维护与评估的 RAG/Agent 系统」。新项目选型时，把它和 LangChain 并列对比、用一个小 RAG 原型跑通再定，是风险最低的路径。

🔗 **信息来源**：Haystack GitHub 官方仓库（github.com/deepset-ai/haystack）2026-08 / Haystack 官方文档（docs.haystack.deepset.ai）2026-08 / CSDN《2026 年 GitHub 开源 AI 生态全景》（blog.csdn.net）2026-08

---

### 4. 【RAGFlow：靠深度文档理解把"扫描件/表格/排版复杂"PDF 也能喂进 RAG 的引擎】

**导语**
普通 RAG 框架一碰到「双栏论文、带表格的合同、扫描版 PDF、图文混排说明书」就露怯：切分把表格切烂、图表信息丢失、回答只能瞎编。RAGFlow 由 InfiniFlow 开源，主打「深度文档理解（DeepDoc）」——在喂给检索器之前先把版式、表格、图表真正读懂，再生成高质量 chunk。它在社区里星标已超 7 万，被很多企业用于「真实、脏、复杂的文档」知识库场景，是 RAG 落地到严肃文档时绕不开的一个选项。

**它是什么**
RAGFlow 是 InfiniFlow 开源的、基于深度文档理解的开源 RAG 引擎，采用 Apache 2.0 许可证。它把文档解析、版式识别、表格结构化、数据清洗、向量检索、重排与 Agent 能力整合进同一个系统，并提供一个开箱即用的 Web UI 与完整 REST API。最新版本持续加入工作流画布与 Agent 节点，已不仅是检索器，而是一整套「企业知识问答」底座。它支持从 PDF、Word、Excel、PPT、图片、邮件到网页的多种来源，并强调「可溯源」的引用，让回答能指向原文片段。

**它解决了什么问题**
核心痛点是「文档越真实，普通 RAG 越翻车」。企业知识大多躺在扫描合同、带图表的研报、双栏手册里，这类文档经朴素字符切分后，表格被拦腰斩断、图注与正文脱节、跨页语义断裂，检索召回的 chunk 本身就错位，模型再强也答不对。RAGFlow 在摄入阶段就做版式分析与表格识别，把一页 PDF 还原成「标题/段落/表格/图表」的结构化块，再据此切分，保证喂进向量的语义单元是完整的。这让「复杂格式文档问答」从不可用到可用，省掉了大量人工预处理与返工。

**原理拆解**
RAGFlow 的差异化在摄入管线（DeepDoc）：它先用版式分析模型识别页面里的文本块、标题、表格区域与图片，再用表格结构识别把单元格关系还原成 Markdown/HTML 表格，图文混排时把图注与邻近正文关联。随后做「智能分块」——不是固定字数硬切，而是按语义与结构边界（如一段落、一表格）生成 chunk，并保留所在页、章节等元数据。检索阶段支持稠密向量 + 关键词的混合检索与重排，保证既语义相关又关键词命中；生成阶段把命中的原文片段回填提示词，并输出引用位置。Web 层提供知识库管理、上传、解析进度与对话界面；底层通过 `/v1` REST API（需 API Key）暴露数据集创建、文档上传、会话与问答，便于嵌进自有系统。其 Python SDK `ragflow_sdk` 把这些 API 封装成 `RAGFlow(api_key=..., base_url=...)` 对象，可用代码完成「建库→传文档→建对话→提问」全流程。

**动手验证**
动手验证 RAGFlow 最稳的方式是 Docker 起一套 + 用官方 SDK 走通「建库→传文档→问答」：
```bash
# 1. 启动（含 MinIO/ES 等依赖）
git clone https://github.com/infiniflow/ragflow && cd ragflow/docker
docker compose up -d
# 2. 浏览器开 http://localhost:9380 注册，拿到 API Key
```
```python
from ragflow_sdk import RAGFlow

rag = RAGFlow(api_key="<你的API_key>", base_url="http://localhost:9380")
# 建知识库
dataset = rag.create_dataset(name="demo")
# 上传一份复杂 PDF（表格/双栏均可）
dataset.upload_documents(["/path/to/report.pdf"])
# 等解析完成后建对话并提问
chat = dataset.create_chat(name="qa")
ans = chat.ask("这份报告里表 2 的核心结论是什么？")
print(ans.answer)        # 引用来自被正确解析的表格块
```
若回答能准确指向表格内容而非瞎编，即验证「深度文档理解」链路打通。把同一份 PDF 丢进朴素 RAG 对比，能直观体会版式/表格识别带来的召回质量差异。

**对比选型**
对比 Dify（可视化、文档理解较浅）、LangChain+LlamaIndex（要自己接解析器）、Milvus（纯向量库、不做事前理解）：RAGFlow 的护城河是「摄入即理解复杂版式」，适合文档脏、格式杂、要可溯源的企业知识库。若你的文档主要是干净 Markdown/纯文本，Dify 或 LlamaIndex 更轻；若你只要一个海量向量检索引擎、解析自己搞定，Milvus 更合适；若你面对的是合同、研报、扫描件这类「硬骨头」，RAGFlow 的深度解析能直接决定项目能不能上线。一句话：文档越复杂，越该先试 RAGFlow。

🔗 **信息来源**：RAGFlow GitHub 官方仓库（github.com/infiniflow/ragflow）2026-08 / RAGFlow 官方文档与 DeepDoc 说明（ragflow.io）2026-08 / GitCode《2026 年值得关注的 GitHub 20 大 AI 项目》（gitcode.csdn.net）2026-08（星标约 74.7k）

---

### 5. 【FastMCP：十几行 Python 就把任意函数变成标准 MCP Server 的易用封装】

**导语**
MCP（Model Context Protocol）已经成为「AI Agent 的 USB-C」——模型要调数据库、查天气、发邮件，不再需要每家写一套私有适配，只要实现 MCP 接口就能即插即用。但官方 MCP Python SDK 偏底层，写个 server 要管 transport、收发消息。FastMCP 在官方 SDK 之上做了一层极简封装：一个 `@mcp.tool()` 装饰器就把普通函数变成可被任意 MCP 客户端发现调用的工具。想在 2026 年的 Agent 生态里给你的服务「接上插头」，FastMCP 是最低门槛的入口。

**它是什么**
FastMCP 是 MCP 官方 Python SDK（`modelcontextprotocol/python-sdk`）之上的易用封装库，沿用 MCP 开放规范，让开发者用极少代码暴露「工具（tool）、资源（resource）、提示（prompt）」三类原语。MCP 协议本身由 Anthropic 提出、现由社区与多家厂商共建，核心组件是 Server（能力提供方）、Client（Agent 方）与 Transport（stdio / HTTP / SSE）。FastMCP 把 server 的生命周期、schema 推断、传输层都收进 `FastMCP("名字")` 一个对象，并自动从函数签名与类型注解生成工具描述，供 Agent 动态发现与调用。

**它解决了什么问题**
核心痛点是「把内部能力接给 Agent 太重」。没有 MCP 时，你想让 Claude/Cursor/某 Agent 调用你的内部 API，得写一套私有插件、自己管参数 schema、自己处理调用协议；每个 Agent 一套，重复劳动。MCP 把这件事标准化：能力方实现一次 server，任何兼容 MCP 的客户端都能即插即用。但底层 SDK 仍要写收发逻辑，FastMCP 进一步把「普通 Python 函数 → 标准 MCP 工具」压缩到几行，让「给服务加 AI 插头」的成本趋近于零，从而真正释放 MCP 生态的网络效应。

**原理拆解**
FastMCP 的工作流是「装饰即注册」：用 `@mcp.tool()` 装饰的函数，FastMCP 会读取其类型注解与 docstring，自动生成 JSON Schema 作为工具描述；当 MCP 客户端连上 server，先发 `tools/list` 发现工具清单，再发 `tools/call` 带参调用，FastMCP 在内部把请求路由到对应函数、把返回值序列化回客户端。除 tool 外，它还支持 `@mcp.resource("协议://路径")` 暴露只读数据、`@mcp.prompt()` 暴露可复用提示模板。传输层默认 stdio（适合被本地 Agent 以子进程方式拉起），也可切到 HTTP/SSE 做远程服务。客户端侧则用官方 `mcp` SDK 的 `ClientSession` 连接、列工具、调用。整套机制让「模型能力 ↔ 外部工具」的鸿沟被一个标准插座填平，也是 2026 年 Agent 框架（Claude Code、Cursor、n8n-MCP 等）能互相打通的底层原因。

**动手验证**
动手验证 FastMCP 是否名副其实，可写一个最小 server 并用官方客户端连上调用：
```python
# server.py
from fastmcp import FastMCP
mcp = FastMCP("demo")

@mcp.tool()
def add(a: int, b: int) -> int:
    """返回两个整数之和"""
    return a + b

if __name__ == "__main__":
    mcp.run()   # 默认 stdio 传输
```
```python
# client.py（另一个进程/客户端）
import asyncio
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

async def main():
    params = StdioServerParameters(command="python", args=["server.py"])
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            tools = await s.list_tools()
            print([t.name for t in tools.tools])   # ['add']
            res = await s.call_tool("add", {"a": 2, "b": 3})
            print(res.content)                       # 5

asyncio.run(main())
```
先把 server 跑起来，再跑 client，若打印出 `['add']` 与结果 `5`，即验证「函数→标准 MCP 工具→客户端发现并调用」链路打通。把 `add` 换成查数据库/调内部 API 的函数，你的服务就拥有了一个 AI 可插拔的插头。

**对比选型**
对比官方 `mcp` 底层 SDK（灵活但要手写传输与路由）、LangChain 的 tool 抽象（仅限 LangChain 体系、非跨 Agent 标准）、Function Calling（各家 API 私有、不可跨客户端复用）：FastMCP + MCP 的最大优势是「一次实现、任意兼容客户端可用」的开放标准属性，适合想让能力被多 Agent 复用的团队。若你只在单一 LangChain 应用里用工具，LangChain 原生 tool 也够；若你要对接 Claude Code / Cursor / n8n 等多客户端，MCP 是当下事实标准，而 FastMCP 是把 MCP server 写得最省事的那一层。更进一步，MCP 的「能力方实现一次、任意兼容客户端可用」属性，意味着你写的内部工具未来可被更多新 Agent 直接消费，不存在被某家框架锁死的风险。2026 年做 Agent 工具链，优先用 MCP 而非私有插件，已是明显趋势；而用 FastMCP 落地，则能把「服务 AI 化」的边际成本压到几乎可忽略。

🔗 **信息来源**：MCP 官方 Python SDK 仓库（github.com/modelcontextprotocol/python-sdk）2026-08 / Model Context Protocol 官方规范（modelcontextprotocol.io）2026-08 / CSDN《MCP协议开发实战：从零搭建AI Agent工具链》（blog.csdn.net）2026-08

---

### 6. 【Agent Skills：用一份 SKILL.md 给 Copilot/Claude 写可复用、可跨工具发现的技能包】

**导语**
你的团队总在重复同一套多步工作流——出构建流水线、写变更日志、按规范建 GitHub Issue。与其每次靠人写长提示词，不如把它固化成一个「技能包」：一份 `SKILL.md`，AI 编程助手在相关场景自动发现并套用。2026 年 Agent Skills 已成开放规范（agentskills.io），GitHub Copilot、Claude Code 等都能读同一份文件，社区仓库 awesome-copilot 已沉淀大量现成技能。对想让团队 AI 助手「行为一致、可复用」的工程师，这是投入产出比极高的一课。

**它是什么**
Agent Skills 是一种任务级指令规范：每个技能是一个含 `SKILL.md` 的目录，`SKILL.md` 顶部用 YAML frontmatter 写 `name` 与 `description`，正文写操作步骤、示例与边界。它不同于「始终生效的自定义指令」和「一次性提示词文件」，而是「可被发现、按需激活」的工作流能力。规范由 agentskills.io 定义，GitHub Copilot（`.github/skills/`）与 Claude Code（`.claude/skills/`）等共享同一格式，因此一份技能可被多工具复用。GitHub CLI 自 v2.90.0 起把 `gh skill` 做成一等原语，可搜索、安装、发布社区技能。

**它解决了什么问题**
核心痛点是「好流程只存在老员工的脑子里」。团队里「怎么出 changelog、怎么按规范建 issue、怎么跑回归」往往靠口口相传或一份没人看的文档；新人每次都得重新问。把流程写成 SKILL.md 后，AI 助手在检测到相关意图时自动激活该技能，按既定步骤执行，行为在整个团队保持一致、可版本化、可共享。它把「个人经验」变成「仓库资产」，既降低协作成本，也让 AI 助手的输出更可控、可审计——这正是生产环境愿意把 AI 编进工作流的前提。

**原理拆解**
Agent Skills 的机制分三层：其一，发现——助手扫描 `.github/skills/`、`.claude/skills/`、`.agents/skills/`（仓库级）与 `~/.copilot/skills/` 等（个人级）目录，读 `SKILL.md` 的 `description` 做相关性匹配；其二，激活——当用户请求命中描述里的关键词（如「总结暂存改动」「建 issue」），助手加载该技能并执行其步骤；其三，渐进式披露（progressive disclosure）——主 `SKILL.md` 只写流程概览（建议 <500 行），详细模板/脚本放 `references/`、`scripts/`、`templates/`，用到时才加载，省上下文。frontmatter 里 `name` 必须与父目录同名、`description` 要含「你会真打出来的关键词」且用动词描述动作；可选的 `allowed-tools` 预批准该技能可使用的工具。发布侧 `gh skill publish` 会校验规范与供应链安全（不可变发布、标签保护等），安装时把来源/ref/tree SHA 写回 frontmatter 以便溯源。

**动手验证**
动手验证 Agent Skills 是否真能被发现并触发，先建一个最小「提交摘要」技能：
```bash
mkdir -p .github/skills/commit-summary
cat > .github/skills/commit-summary/SKILL.md << 'EOF'
---
name: commit-summary
description: Summarizes staged git changes in bullet points. Use when asked to summarize staged changes, explain a git diff, or list what changed before committing.
---
# Commit Summary
## Inputs
使用 `git diff --staged` 的暂存改动。
## Workflow
1. 读取 `git diff --staged`。
2. 按文件分组改动。
3. 产出简洁的要点摘要。
## Output format
- 每个改动文件一条 bullet
- 每条一句话，说明行为影响
EOF
```
保存后，在支持 Agent Skills 的助手（如启用 agent mode 的 GitHub Copilot 或 Claude Code）里输入「/commit-summary」或直接说「总结我的暂存改动」。若助手列出按文件分组的要点，即验证技能被发现并激活。再用 CLI 安装社区技能验证分发：
```bash
gh --version                       # 需 >= 2.90.0
gh skill install github/awesome-copilot documentation-writer
gh skill list                      # 看到已装技能
```
能把他人发布的技能装进本地并生效，即验证整套开放分发链路打通。

**对比选型**
对比自定义指令（custom instructions，始终生效的全局规则）、提示词文件（一次性复用）、自定义 Agent/子代理（更重的持久角色）：Agent Skills 的甜区是「可被发现、按需激活的多步工作流」，既不像全局指令那样永远占上下文，也不像一次性提示词那样不可复用。若你要把「团队编码规范」变成每次都遵守的默认，用自定义指令；若要把「一个具体可重复任务」变成助手能自己调用的能力，用 Agent Skills。由于它遵循开放格式、Copilot 与 Claude Code 通用，写一次就能多工具跑，是 2026 年「把 AI 编进团队流程」里性价比最高、也最标准化的切入点。更进一步，技能目录随仓库走版本控制，任何改动都有 diff、可评审、可回滚，等于把团队流程沉淀成了可审计的代码资产，这对金融、医疗等强合规行业尤其关键。新团队建议先从 2–3 个最高频流程（changelog / issue / 测试生成）写成技能起步，跑顺后再逐步把更多隐性经验固化进去，让 AI 助手的行为随团队知识库一起成长。

🔗 **信息来源**：GitHub 官方《Use Agent Skills with GitHub Copilot》（learn.microsoft.com）2026-08 / Agent Skills 开放规范与 awesome-copilot 仓库（github.com/awesome-copilot、agentskills.io）2026-08 / GitHubSpecTutorial《GitHub Copilot Agent Skills Tutorial》（github.com/mickpletcher/GitHubSpecTutorial）2026-08
