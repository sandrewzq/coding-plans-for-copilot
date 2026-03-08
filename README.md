# 编码套餐看板 (Coding Plans Dashboard)

自动抓取并展示国内/出海 AI 编码大模型的标准试用与月订套餐定价的静态看板。

## 主要特性

- **自动抓取与去重**：Node.js 脚本拉取官方定价（智谱、Kimi、MiniMax、百度、火山引擎等）
- **标准化输出**：统一生成 `provider-pricing.json` 供前端消费
- **纯静态展示**：HTML/Vanilla JS/CSS，无运行时依赖
- **本地预览**：内置轻量 HTTP 服务，快速验证结果

## 快速开始

> 自动部署测试标记（可删除）

### 安装依赖

```bash
npm install
```

### 拉取最新定价

```bash
npm run pricing:fetch
```

### 本地预览

```bash
npm run pricing:serve
```

浏览器访问 `http://127.0.0.1:4173`

### 在线页面

[在线看板页面](https://sandrewzq.github.io/coding-plans-for-copilot/)

## 目录结构

```
.
├── docs/                   # 静态看板页面与运行时数据
│   ├── index.html          # 主页面
│   ├── app.js              # 前端逻辑
│   ├── styles.css          # 样式文件
│   └── provider-pricing.json   # 生成的定价数据
├── scripts/                # 定价拉取脚本与本地服务
│   ├── providers/          # 各供应商解析器
│   ├── utils/              # 通用工具与标准化逻辑
│   └── fetch-provider-pricing.js   # 主抓取脚本
└── assets/                 # 数据快照（可选）
```

## 数据说明

- 仅保留「标准月订/试用」套餐，过滤无有效信息的条目
- 失败的供应商会记录在 `failures` 字段，方便排查

## 厂商列表

> **维护说明**
>
> 1. **AI Agent 规则**：后续所有 AI Agent 在处理本项目时，必须遵循以下规则：
>    - 以此列表为唯一厂商顺序来源，保持所有代码、配置、展示顺序与此列表一致
>    - 可在表中任意位置添加新厂商，AI 会按照表格顺序更新所有相关文件
>    - 修改厂商信息时，同步更新名称、链接等所有关联内容
>
> 2. **列表更新**：只需维护以下表格，AI 会自动同步更新到 `app.js` 的 `PROVIDER_ORDER`、`PROVIDER_LABELS`、`PROVIDER_BUY_URLS` 以及数据抓取脚本等所有相关代码
>
> 3. **自动同步**：运行 `npm run pricing:sync` 命令，脚本会自动：
>    - 更新 `docs/app.js` 中的厂商配置
>    - 更新 `scripts/utils/index.js` 中的 `PROVIDER_IDS`
>    - 更新 `scripts/fetch-provider-pricing.js` 中的任务列表和导入语句
>    - 为新厂商自动创建解析器文件模板（位于 `scripts/providers/`）
>    - 开发者只需完善新解析器中的 TODO 部分即可

| 厂商 | 链接 |
|------|------|
| 智谱 | https://www.bigmodel.cn/glm-coding?ic=BZRLCDAC1G |
| MiniMax | https://platform.minimaxi.com/subscribe/coding-plan |
| Kimi | https://www.kimi.com/code/zh |
| 阿里云百炼 | https://www.aliyun.com/benefit/scene/codingplan |
| 火山引擎 | https://volcengine.com/L/AJgcLIP_-o4/ |
| 腾讯云 | https://cloud.tencent.com/act/pro/codingplan |
| 快手 KwaiKAT | https://www.streamlake.com/marketing/coding-plan |
| 百度智能云千帆 | https://cloud.baidu.com/product/codingplan.html |
| 无问芯穹 | https://cloud.infini-ai.com/platform/ai |
| 优云智算 | https://www.compshare.cn/coding-plan |
| 摩尔线程 | https://code.mthreads.com/ |
| X-AIO | https://code.x-aio.com/ |
| ZenMux | https://zenmux.ai/pricing/subscription |
| Chutes | https://chutes.ai/pricing |

## 致谢

本项目基于 [jqknono/coding-plans-for-copilot](https://github.com/jqknono/coding-plans-for-copilot) 开发，感谢原作者的开源贡献。

## 贡献指引

**添加新厂商步骤：**

1. 在上方「厂商列表」表格中添加新厂商信息（名称和链接）
2. 运行 `npm run pricing:sync` 自动同步配置
3. 脚本会自动创建解析器文件模板在 `scripts/providers/` 目录
4. 打开新创建的解析器文件，根据页面结构完善 TODO 部分的解析逻辑
5. **⚠️ 重要**：同时手动更新 `docs/app.js` 中的 `PROVIDER_ORDER` 数组，确保导航栏顺序与 README 中的厂商列表顺序一致
5. 运行 `npm run pricing:fetch` 测试新厂商的数据抓取
6. 提交代码并推送
