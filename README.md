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

将项目推送到 GitHub 仓库的 `main` 分支。在仓库 **Settings → Pages → Build and deployment** 中将 **Source** 设为 **GitHub Actions**。工作流会自动构建并部署 `dist`。页面使用相对资源路径和 Hash 路由，兼容仓库子路径。

