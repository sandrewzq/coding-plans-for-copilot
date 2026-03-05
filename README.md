# 编码套餐看板 (Coding Plans Dashboard)

一个自动抓取并展示各家国内/出海 AI 代码大模型最新标准试用与月订套餐的独立看板程序。

## 功能介绍
- **抓取脚本**：Node.js 实现的自动定价拉取与去重脚本，直接获取最新价格信息（包括 Zhipu, Kimi, Minimax, Baidu, Volcengine 等）。
- **静态看板**：生成 `provider-pricing.json` 后，通过零依赖纯静态的前端页面直接渲染表格。

## 项目结构
- `docs/`: 静态独立页面（HTML/Vanilla JS/CSS），可以直接部署在 GitHub Pages 等平台上。
- `scripts/`: 数据拉取和本地测试服务脚本。
- `assets/`: 统一放置生成的定价数据文件 `provider-pricing.json`。

## 使用方法

### 更新数据与本地测试

拉取各大厂最新大模型套餐定价：
```bash
npm run pricing:fetch
```

本地启动静态预览页面（默认端口 4173）：
```bash
npm run pricing:serve
```

直接访问 [在线看板页面](https://sandrewzq.github.io/coding-plans-for-copilot/)。
