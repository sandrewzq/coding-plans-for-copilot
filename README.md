# 编码套餐看板 (Coding Plans Dashboard)

自动抓取并展示国内/出海 AI 编码大模型的标准试用与月订套餐定价的静态看板。

## 主要特性

- **自动抓取与去重**：Node.js 脚本拉取官方定价（智谱、Kimi、MiniMax、百度、火山引擎等）
- **标准化输出**：统一生成 `provider-pricing.json` 供前端消费
- **纯静态展示**：HTML/Vanilla JS/CSS，无运行时依赖
- **本地预览**：内置轻量 HTTP 服务，快速验证结果

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 抓取最新定价数据
npm run pricing:fetch

# 3. 本地预览
npm run pricing:serve
```

浏览器访问 http://127.0.0.1:4173

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

## 维护指南

### 工作流程说明

本项目采用「用户维护列表 + Agent 自动同步」的工作模式：

**你的职责（只需做这一件事）：**
- 维护上方 **【厂商列表】** 表格中的厂商名称和链接

**Agent 的职责（自动完成）：**
- 对比当前代码与【厂商列表】的差异
- 新增厂商：创建解析器模板、更新所有配置文件
- 更新厂商：同步修改名称、链接等所有关联内容
- 调整顺序：确保所有代码中的厂商顺序与【厂商列表】完全一致
- 验证并报告完成状态

---

### 同步厂商列表

当你修改【厂商列表】后，只需告知 Agent：

> **"请同步更新厂商列表"**

Agent 会自动检测差异并完成所有更新：

1. **对比分析**：对比【厂商列表】与代码中的当前配置
2. **新增厂商**：创建解析器文件并完善抓取逻辑
3. **信息更新**：同步修改厂商名称、链接等
4. **顺序调整**：确保所有代码中的顺序与【厂商列表】一致
5. **验证报告**：报告完成状态并提示验证步骤

**Agent 将更新的文件：**
- `docs/app.js` - `PROVIDER_ORDER`, `PROVIDER_LABELS`, `PROVIDER_BUY_URLS`
- `scripts/utils/index.js` - `PROVIDER_IDS`, `PROVIDER_NAMES`
- `scripts/fetch-provider-pricing.js` - 任务列表、导入语句
- `scripts/providers/<新厂商>.js` - 新厂商解析器（新增时）

**完成后进行手动验证**（见下方验证步骤）

---

### 如何验证同步结果

Agent 完成同步后，按以下步骤验证：

#### 1. 检查配置文件
```bash
# 检查 app.js 中的配置
grep -n "PROVIDER_ORDER\|PROVIDER_LABELS\|PROVIDER_BUY_URLS" docs/app.js

# 检查工具类中的配置
grep -n "PROVIDER_IDS\|PROVIDER_NAMES" scripts/utils/index.js
```

#### 2. 检查解析器文件
```bash
# 确认新厂商的解析器文件已创建
ls -la scripts/providers/

# 确认解析器已在主脚本中导入
grep -n "require.*providers" scripts/fetch-provider-pricing.js
```

#### 3. 测试数据抓取
```bash
# 运行抓取脚本，检查新厂商是否能正常获取数据
npm run pricing:fetch

# 检查生成的数据文件
cat docs/provider-pricing.json | grep -A 5 "新厂商ID"
```

#### 4. 本地预览验证
```bash
# 启动本地服务
npm run pricing:serve

# 浏览器访问 http://127.0.0.1:4173
# 验证：
# - 导航栏是否显示新厂商
# - 厂商顺序是否正确
# - 点击购买链接是否跳转正确
```

#### 5. 检查失败项
```bash
# 查看抓取失败的厂商
cat docs/provider-pricing.json | grep -A 20 "failures"
```

---

### 需要修改的文件清单

当你修改【厂商列表】后，Agent 会同步更新以下文件：

| 文件路径 | 更新内容 |
|---------|---------|
| `docs/app.js` | `PROVIDER_ORDER`, `PROVIDER_LABELS`, `PROVIDER_BUY_URLS` |
| `scripts/utils/index.js` | `PROVIDER_IDS`, `PROVIDER_NAMES` |
| `scripts/fetch-provider-pricing.js` | 任务列表、import 语句 |
| `scripts/providers/<新厂商>.js` | 新厂商解析器模板（新增时） |

---

## 致谢

本项目基于 [jqknono/coding-plans-for-copilot](https://github.com/jqknono/coding-plans-for-copilot) 开发，感谢原作者的开源贡献。
