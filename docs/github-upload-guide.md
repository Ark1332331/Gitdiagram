# GitHub 上传/新建仓库速查（Windows / VS Code / 终端）

这份文档的目标：**以后你不需要任何人帮忙**，也能把本地项目上传到你新建的 GitHub 仓库，并长期维护更新。

---

## 0. 先确认：不要把密钥传上去

- 一般把真实密钥放在 `.env`，并确保它在 `.gitignore` 中（本项目已忽略）。
- 可以提交 `.env.example`（空值示例），不要提交 `.env`。

检查：

```bash
git status
```

如果看到 `.env` 出现在待提交列表里：立刻停止，先把它移出 git 跟踪（不要上传）。

---

## 1. 日常更新（你已经有 GitHub 仓库了）

这是最常用的流程：

```bash
git pull

git add -A
git commit -m "简短描述你改了什么"

git push
```

提示：如果 `git commit` 说没有变更，就不需要 commit。

---

## 2. 把“已有本地项目”上传到“新建 GitHub 仓库”（推荐做法）

### 2.1 先在 GitHub 网页创建仓库

- 建议创建 **空仓库**（不要勾选 Initialize with README / License / .gitignore）
- 复制仓库地址（HTTPS）：例如 `https://github.com/<you>/<repo>.git`

### 2.2 终端里推送（本地已经是 git 仓库的情况）

1）确认当前目录就是项目根目录：

```bash
git status
```

2）添加远端并推送：

```bash
git remote add origin https://github.com/<you>/<repo>.git

git add -A
git commit -m "init"

git push -u origin main
```

如果你本地分支不是 `main`，先看一下：

```bash
git branch
```

---

## 3. 如果你的 GitHub 新仓库不是空的（最常见坑）

症状：`git push` 报 `rejected (non-fast-forward)`。

原因：你创建仓库时勾选了 README/License，远端已经有一个初始提交。

### 方案 A（推荐）：重新创建一个空仓库

最省事、最不容易出错。

### 方案 B：保留远端初始提交，用 rebase 合并

```bash
git fetch origin main

git rebase origin/main
# 如果有冲突：按提示解决冲突后
# git add <冲突文件>
# git rebase --continue

git push -u origin main
```

### 方案 C：你确定远端初始提交不要，直接覆盖远端

只适用于：你明确知道远端的 README/license 没价值、就是初始化产生的。

```bash
git push --force-with-lease origin main
```

---

## 4. 如果你本地还不是一个 git 仓库（从 0 开始初始化）

在项目根目录执行：

```bash
git init

git add -A
git commit -m "init"

git branch -M main

git remote add origin https://github.com/<you>/<repo>.git

git push -u origin main
```

---

## 5. 保持“只有你自己”的仓库（不要出现 Fork/共创的显示）

关键点：

- **不要在 GitHub 上点 Fork** 去创建仓库。
- 直接创建一个全新的仓库，然后按本文把代码推上去。

本地推荐 remote 结构（可选）：

- `origin`：你自己的仓库（默认 push 到这里）
- `upstream`：原作者仓库（只用于对比/拉取更新）

设置示例：

```bash
# 把原作者仓库作为 upstream（如果你需要）
git remote add upstream https://github.com/<author>/<repo>.git

# 查看远端列表
git remote -v
```

---

## 6. （可选）直接用终端创建 GitHub 仓库（需要 gh CLI）

如果你安装了 GitHub CLI（`gh`），可以不用打开网页：

```bash
# 登录（首次）
gh auth login

# 在当前目录创建一个同名仓库并推送
# --source=. 表示用当前目录
# --private/--public 自选
# --remote=origin 表示设置 origin
gh repo create <you>/<repo> --public --source=. --remote=origin --push
```

如果终端提示找不到 `gh`，说明你没装 GitHub CLI：
- 继续用“网页创建仓库 + git remote add origin”的方式即可。

---

## 7. 常见问题速查

- `fatal: not a git repository`：你还没 `git init`。
- `remote origin already exists`：已经设置过 origin。
  - 看一下：`git remote -v`
  - 修改：`git remote set-url origin <new-url>`
- `Permission denied` / 认证失败：需要重新登录 GitHub（浏览器/凭据管理器）或换 SSH。

---

## 8. 最小“我就记这三条”版本

日常更新：

```bash
git add -A
git commit -m "msg"
git push
```
