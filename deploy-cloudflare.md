# myNews 网站部署到 Cloudflare Pages 指南

## 问题背景

腾讯云 COS 2024年1月1日后创建的存储桶，默认域名会强制下载文件（`x-cos-force-download: true`），无法通过 API 关闭。需要改用境外静态托管服务。

## 推荐方案：Cloudflare Pages（免费、稳定、快速）

### 第一步：注册 Cloudflare 账号

1. 打开 https://dash.cloudflare.com/sign-up
2. 输入邮箱和密码
3. 去邮箱点击验证链接

### 第二步：获取 API Token

1. 登录 https://dash.cloudflare.com/profile/api-tokens
2. 点击 "Create Token"
3. 选择 "Edit Cloudflare Workers" 模板
4. 点击 "Continue to summary" → "Create Token"
5. **复制 Token**（只显示一次！）

### 第三步：部署

在终端执行以下命令：

```bash
# 1. 设置 API Token
export CLOUDFLARE_API_TOKEN="你的token粘贴到这里"

# 2. 进入项目目录
cd /Users/ysrtc/Desktop/myNews

# 3. 一键部署（wrangler 已安装好）
npx wrangler pages deploy . --project-name=my-news
```

部署成功后会输出类似：
```
✨ Deployment complete! Take a peek over at
   https://my-news.pages.dev
```

### 后续更新

每次新闻更新后，执行：
```bash
export CLOUDFLARE_API_TOKEN="你的token"
cd /Users/ysrtc/Desktop/myNews
npx wrangler pages deploy . --project-name=my-news
```

## 备选方案：Netlify（免费）

```bash
# 1. 安装（已装好）
npm install -g netlify-cli

# 2. 部署（会打开浏览器登录）
cd /Users/ysrtc/Desktop/myNews
npx netlify deploy --prod --dir=.

# 3. 按提示操作，完成后会给出 xxx.netlify.app 的地址
```

## 备选方案：Surge.sh（最简单，无需注册）

```bash
# 1. 安装（已装好）
npm install -g surge

# 2. 部署（第一次会让你输入邮箱和密码）
cd /Users/ysrtc/Desktop/myNews
surge . my-news.surge.sh
```

## 注意事项

- 部署前确保 `.gitignore` 不会排除 `news/` 目录（Cloudflare Pages 直接上传整个目录，不走 git）
- Surge.sh 免费版域名后缀为 `.surge.sh`，可后续绑定自定义域名
- Cloudflare Pages 免费版域名后缀为 `.pages.dev`，全球 CDN 加速
