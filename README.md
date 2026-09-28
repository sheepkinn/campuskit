# CampusKit

大学生的随身工具箱。社会实践材料整理、Word 规范模板、图片、PDF 与 GIF 工具均在浏览器本地处理。

[在线使用 CampusKit](https://sheepkinn.github.io/campuskit/)

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages

仓库根目录已包含编译好的 `index.html` 和 `assets/`，可通过 **Deploy from a branch → main / (root)** 发布。项目也包含 GitHub Actions 工作流，可将 **Source** 设为 **GitHub Actions**，让后续提交自动构建并部署 `dist`。页面使用相对资源路径和 Hash 路由，兼容仓库子路径。

## 真实访问统计

访问统计使用 Supabase 保存匿名访问会话与成功完成的工具操作，不上传用户文件或文件名。先在 Supabase 执行 `supabase/migrations/20260928_campuskit_analytics.sql`，再将项目 URL 和 **publishable key** 配置为 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`。发布前重新运行 `npm run build`，将 `dist/index.html` 与 `dist/assets/` 同步到仓库根目录。不要把 secret key 或 service_role key 放入前端。

若使用 Supabase 的 GitHub Integration 自动部署数据库迁移，请将 Working directory 设为 `.`，并启用 **Deploy to production**；仅授权仓库访问不会自动应用迁移。

“访问”按浏览器标签页会话计数；“工具使用访客”按至少成功完成一次操作的独立浏览器计数；“仅浏览访问”统计开始至少 5 分钟且未成功完成工具操作的会话。上线初期的 70+、约 20–30、50+ 是项目方提供的人工汇总，历史原始事件不存在，因此不并入实时计数。
