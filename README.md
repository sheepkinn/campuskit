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
