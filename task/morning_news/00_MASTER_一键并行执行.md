# 🚀 MASTER: 17板块并行生成 — 一键执行

> **用途**：一次执行本任务，自动并行生成全部17个板块的早间新闻。
> **原理**：利用 CodeBuddy Team Mode，主 agent 派发 17 个子 agent 并行工作。
> **触发方式**：对 CodeBuddy 说"运行 MASTER 一键并行" 或执行此自动化。

---

## 📋 执行参数

| 参数 | 值 |
|------|-----|
| **新闻日期** | {DATE}（如2026-05-13） |
| **搜索时段** | {DATE-1} 07:00 ~ {DATE} 07:00 |
| **输出目录** | `workspace/news/{YYYYMM}/{YYYYMMDD}/` |
| **工作目录** | `{workspace}` |

---

## 🎯 执行流程

### 阶段1：准备（主 agent 执行）
1. 创建输出目录：`mkdir -p news/{YYYYMM}/{YYYYMMDD}/`
2. 读取 `00_公共配置.md` 获取通用规则
3. 创建团队（team_create）

### 阶段2：派发17个子 agent 并行执行
每个子 agent 独立完成以下工作：
1. 读取对应的板块任务文件（如 `01_今日头条.md`）
2. 读取 `00_公共配置.md` 中的通用规则
3. 调用 `web_search` 搜索该板块所需主题
4. 按模板撰写新闻内容
5. 写入独立输出文件（如 `news/{YYYYMM}/{YYYYMMDD}/01_今日头条.md`）
6. 向主 agent 报告完成

**17个板块并行执行，互不依赖：**

| 编号 | 子 agent 名称 | 任务文件 | 输出文件 |
|:----:|:--------------|:---------|:---------|
| 01 | `worker-01` | `01_今日头条.md` | `01_今日头条.md` |
| 02 | `worker-02` | `02_科技热点.md` | `02_科技热点.md` |
| 03 | `worker-03` | `03_AI与前沿科技.md` | `03_AI与前沿科技.md` |
| 04 | `worker-04` | `04_软件开发.md` | `04_软件开发.md` |
| 05 | `worker-05` | `05_开发语言.md` | `05_开发语言.md` |
| 06 | `worker-06` | `06_华为开发生态.md` | `06_华为开发生态.md` |
| 07 | `worker-07` | `07_iOS开发生态.md` | `07_iOS开发生态.md` |
| 08 | `worker-08` | `08_Android开发生态.md` | `08_Android开发生态.md` |
| 09 | `worker-09` | `09_跨平台开发生态.md` | `09_跨平台开发生态.md` |
| 10 | `worker-10` | `10_移动端生态.md` | `10_移动端生态.md` |
| 11 | `worker-11` | `11_AI开发生态.md` | `11_AI开发生态.md` |
| 12 | `worker-12` | `12_GitHub实用Skills.md` | `12_GitHub实用Skills.md` |
| 13 | `worker-13` | `13_AI知识点.md` | `13_AI知识点.md` |
| 14 | `worker-14` | `14_产品发布.md` | `14_产品发布.md` |
| 15 | `worker-15` | `15_国内热点.md` | `15_国内热点.md` |
| 16 | `worker-16` | `16_国际大事件.md` | `16_国际大事件.md` |
| 17 | `worker-17` | `17_财经市场.md` | `17_财经市场.md` |

### 阶段3：合并与发布（主 agent 执行）
1. 等待所有子 agent 完成
2. 依次读取17个输出文件
3. 按板块顺序合并为最终文件 `news/{YYYYMM}/{YYYYMMDD}/{YYYYMMDD}_早间.md`
4. 更新 `news-index.json`
5. 更新 `sw.js`（CACHE_VERSION +1）
6. `git add -A && git commit -m "添加 {DATE} 早间新闻" && git push`

---

## 🤖 给 CodeBuddy AI 的执行指令

当你收到"运行 MASTER 一键并行"或"生成今日新闻"的指令时，请按以下步骤执行：

### Step 1: 准备环境
```bash
TODAY=$(date +"%Y%m%d")
YEAR_MONTH=$(date +"%Y%m")
mkdir -p "news/$YEAR_MONTH/$TODAY"
```

### Step 2: 读取公共配置和所有任务文件
- 读取 `task/morning_news/00_公共配置.md` 获取通用规则
- 读取所有 17 个 `task/morning_news/XX_*.md` 确认每个板块的具体要求

### Step 3: 创建团队并派发并行任务
使用 `team_create` 创建团队 `news-generator`，然后使用 `Task` 工具（team mode）派发 17 个子 agent：

**每个子 agent 的 prompt 结构：**
```
你是新闻板块生成专家。
通用规则已由主 agent 提供（00_公共配置.md 内容概览）。
你的任务：生成【板块名称】板块。

当前日期：{DATE}
搜索时段：{DATE-1} 07:00 ~ {DATE} 07:00
输出文件：news/{YYYYMM}/{YYYYMMDD}/XX_板块名.md

具体要求（来自对应 XX_板块名.md）：
[粘贴该板块的完整配置内容]

执行步骤：
1. web_search 搜索该板块各子领域的最新新闻
2. 按模板格式撰写新闻（每条包含：核心内容、背景补充、行业影响、竞争格局、未来走向、AI智能分析、信息来源）
3. 使用 write_to_file 写入输出文件
4. 通过 send_message 向主 agent 报告完成
```

### Step 4: 等待所有子 agent 完成
- 通过 send_message 接收每个 worker 的完成通知
- 确认所有 17 个输出文件都已生成

### Step 5: 合并与发布
```bash
# 1. 读取所有板块文件，合并为最终文件
# 2. 更新 news-index.json
# 3. 更新 sw.js
# 4. git add -A && git commit -m "添加 YYYY-MM-DD 早间新闻"
# 5. ./scripts/push.sh
```

---

## ✅ 注意事项

- **全局去重**：需要主 agent 在最终合并时检查17个板块之间是否有重复新闻
- **失败重试**：如有子 agent 失败，主 agent 应重新派发该板块
- **超时处理**：设定每子 agent 最大执行时间，超时则标记为需手动处理
- **文件已存在**：如目标文件已存在，覆盖写入（重新生成）

---

## 📌 使用方法

**方式一：手动触发**
> 对 CodeBuddy 说："运行 MASTER 一键并行生成今日新闻"

**方式二：自动化任务**
> 将此文件配置为 CodeBuddy 自动化任务，定时每日执行

---

*版本：1.0 | 创建时间：2026-05-13*
