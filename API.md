# API 文档

本文档描述了 `provider-pricing.json` 的数据结构，供开发者参考。

## 文件位置

```
docs/provider-pricing.json
```

## 数据结构

### 根对象

| 字段 | 类型 | 描述 |
|------|------|------|
| `schemaVersion` | `number` | 数据格式版本，当前为 `1` |
| `generatedAt` | `string` | 数据生成时间，ISO 8601 格式 |
| `providers` | `Provider[]` | 供应商数据数组 |
| `failures` | `string[]` | 抓取失败的错误信息数组 |

### Provider 对象

| 字段 | 类型 | 描述 |
|------|------|------|
| `provider` | `string` | 供应商 ID，见下方供应商列表 |
| `sourceUrls` | `string[]` | 数据来源 URL 数组 |
| `fetchedAt` | `string` | 数据抓取时间，ISO 8601 格式 |
| `plans` | `Plan[]` | 套餐数据数组 |

### Plan 对象

| 字段 | 类型 | 描述 |
|------|------|------|
| `name` | `string` | 套餐名称 |
| `currentPrice` | `number \| null` | 当前价格（数值） |
| `currentPriceText` | `string \| null` | 当前价格（显示文本） |
| `originalPrice` | `number \| null` | 原价（数值） |
| `originalPriceText` | `string \| null` | 原价（显示文本） |
| `unit` | `string \| null` | 计费周期单位（如：月、季） |
| `notes` | `string \| null` | 附加说明 |
| `serviceDetails` | `string[] \| null` | 服务内容详情列表 |

## 供应商 ID 列表

| ID | 名称 |
|----|------|
| `zhipu-ai` | 智谱 z.ai |
| `kimi-ai` | Kimi |
| `volcengine-ai` | 火山引擎 |
| `minimax-ai` | MiniMax |
| `aliyun-ai` | 阿里云百炼 |
| `baidu-qianfan-ai` | 百度智能云千帆 |
| `kwaikat-ai` | 快手 KwaiKAT |
| `x-aio` | X-AIO |
| `compshare-ai` | 优云智算 |
| `infini-ai` | 无问芯穹 |
| `mthreads-ai` | 摩尔线程 |
| `zenmux-ai` | Zenmux |

## 示例数据

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-03-05T11:08:13.628Z",
  "providers": [
    {
      "provider": "aliyun-ai",
      "sourceUrls": [
        "https://www.aliyun.com/benefit/scene/codingplan"
      ],
      "fetchedAt": "2026-03-05T11:08:05.567Z",
      "plans": [
        {
          "name": "Coding Plan Lite",
          "currentPrice": 7.9,
          "currentPriceText": "¥7.9/月",
          "originalPrice": 40,
          "originalPriceText": "¥40/月",
          "unit": "月",
          "notes": "新客首月 7.9",
          "serviceDetails": [
            "能力: 支持 Qwen3.5-Plus、Qwen3-Max 等模型",
            "场景: 面向处理轻量级工作负载的个人开发者"
          ]
        }
      ]
    }
  ],
  "failures": []
}
```

## 使用示例

### JavaScript

```javascript
// 加载数据
const response = await fetch('./provider-pricing.json');
const data = await response.json();

// 遍历所有供应商
for (const provider of data.providers) {
  console.log(`供应商: ${provider.provider}`);
  console.log(`套餐数: ${provider.plans.length}`);
  
  for (const plan of provider.plans) {
    console.log(`  - ${plan.name}: ${plan.currentPriceText}`);
  }
}
```

### Python

```python
import json

# 加载数据
with open('docs/provider-pricing.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 遍历所有供应商
for provider in data['providers']:
    print(f"供应商: {provider['provider']}")
    print(f"套餐数: {len(provider['plans'])}")
    
    for plan in provider['plans']:
        print(f"  - {plan['name']}: {plan['currentPriceText']}")
```

## 数据更新

数据通过 GitHub Actions 自动抓取更新，每天运行两次（UTC 时间 01:00 和 06:00）。

## 错误处理

如果某些供应商抓取失败，错误信息会记录在 `failures` 数组中：

```json
{
  "failures": [
    "aliyun-ai: Request timed out after 15000ms",
    "kimi-ai: Unable to parse response"
  ]
}
```
