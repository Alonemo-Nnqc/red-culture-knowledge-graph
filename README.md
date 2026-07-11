# 上海红色文化知识图谱

“从一大初心到智能未来”上海红色研学数字成果。项目以中共一大纪念馆、周公馆和龙华烈士陵园为三处核心点位，将研学内容建模为人物、地点、事件、时间、文物、精神谱系六类节点。

在线访问：[GitHub Pages](https://alonemo-nnqc.github.io/red-culture-knowledge-graph/)

## 本地运行

```bash
pnpm install
pnpm dev
```

浏览器打开终端显示的地址，通常为 `http://localhost:5173/`。

## 构建与检查

```bash
pnpm validate:data
pnpm test
pnpm test:coverage
pnpm build
pnpm e2e
```

生产构建位于 `dist/`，可部署到任意静态托管服务。Vite 使用相对资源路径，支持子目录部署。

## 数据交付

- `src/data/raw/nodes.json`：68 个节点
- `src/data/raw/relations.json`：96 条关系
- `src/data/raw/sources.json`：30 个来源
- `public/data/`：构建时生成的 `graph.json` 与三张 UTF-8 CSV

核心史实均带来源编号、定位信息与短证据摘录。研学路线与历史时间顺序使用不同关系类型，避免概念混淆。

图谱支持鼠标拖动与 Mac 触控板双指平移；捏合或按住 `Command` / `Control` 后双指移动可缩放。路线视图进入图谱时会自动居中、放大并高亮对应参观点。
