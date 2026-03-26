![License](https://img.shields.io/badge/license-MIT-blue.svg)

# GitDiagram（个人本地复现版）

把任意 GitHub 仓库转换成可交互的 Mermaid 架构图。

本仓库用于我在 Windows 上本地跑通/复现 GitDiagram：默认使用 Next.js 内置生成接口（不强制依赖 FastAPI），并支持 OpenAI-compatible 的大模型服务（例如 DeepSeek）。

## 功能

- 把仓库结构生成 Mermaid 图（支持点击跳转到源码/目录）
- 支持导出 Mermaid/PNG
- 支持私有仓库（通过 GitHub PAT 提升速率限制）

## 我做过的关键修改

- **支持 OpenAI-compatible Provider**：新增 `OPENAI_BASE_URL`，并把流式生成切换到 Chat Completions 以兼容 DeepSeek 等。
- **GitHub PAT 更易用**：
	- 前端允许 `ghp_...`（classic）和 `github_pat_...`（fine-grained）
	- GitHub API 认证统一使用 `Authorization: Bearer <token>`
- **兼容 `.git` 仓库 URL**：输入 clone URL（以 `.git` 结尾）会自动剥离后缀。
- **本地 DB 抖动更稳**：非关键 DB 查询失败不再导致页面直接报 “Something went wrong”。

## 快速开始（本地运行）

### 0. 环境要求

- Node.js（建议 22 或 23；本项目声明不支持 24，但很多情况下也能跑）
- pnpm
- Docker Desktop（用于本地 Postgres）

### 1. 安装依赖

```bash
pnpm i
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`（重点几项）：

- `POSTGRES_URL`：本地一般是 `postgresql://postgres:<密码>@localhost:5432/gitdiagram`
- `OPENAI_API_KEY`：你的 DeepSeek/OpenAI key
- `OPENAI_BASE_URL`：OpenAI-compatible base（DeepSeek 形如 `https://api.deepseek.com/v1`）
- `OPENAI_MODEL`：例如 `deepseek-reasoner`
- `GITHUB_PAT`（可选）：提升 GitHub API 限额，避免 403 rate limit

提示：`.env` 已被 `.gitignore` 忽略，不会提交到仓库。

### 3. 启动本地数据库（Docker）

如果你不想用 `start-database.sh`（它偏向 WSL），可以直接启动一个容器：

```bash
docker run -d --name gitdiagram-postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=localdev \
	-e POSTGRES_DB=gitdiagram \
	-p 5432:5432 postgres
```

（已存在容器时用 `docker start gitdiagram-postgres`）

### 4. 初始化数据库表

```bash
pnpm db:push
```

### 5. 启动开发服务器

```bash
pnpm dev
```

打开 `http://localhost:3000`。

## 常见问题（排错）

- **端口占用 / 无法获取 `.next/dev/lock`**：
	- 结束占用 3000 的进程，然后删除 `.next/dev/lock` 再 `pnpm dev`
- **GitHub 403 rate limit**：
	- 在页面右上角 `Private Repos` 里填 PAT（或在 `.env` 配 `GITHUB_PAT`），再重试
- **DB 连接拒绝（ECONNREFUSED）**：
	- 确认 `gitdiagram-postgres` 容器在跑，且 `.env` 的 `POSTGRES_URL` 端口/密码一致

## （可选）使用外部 FastAPI 后端

本项目保留 FastAPI（`backend/`）路径。要让前端走外部后端：

- `NEXT_PUBLIC_USE_LEGACY_BACKEND=true`
- `NEXT_PUBLIC_API_DEV_URL=http://localhost:8000`

