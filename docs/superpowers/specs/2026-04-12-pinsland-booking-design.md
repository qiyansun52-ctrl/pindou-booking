# 拼豆岛（PINSLAND）预约系统设计文档

## 概述

为拼豆岛（PINSLAND）构建一套线上预约系统，包含顾客端 H5 网页和管理后台。顾客通过 WhatsApp 分享的链接进入预约页面，选择时间和人数后提交预约，店家在后台审核确认。

## 业务背景

- **品牌：** 拼豆岛 PINSLAND（SHERVIE ART）
- **地址：** JAYAONE | UM，Pacific Star
- **微信：** PINSLAND
- **座位数：** 4 个
- **收费方式：** 线下结算（套餐价见海报：1h 19.9 RM / 2h 36.6 RM / 3h 49.9 RM，开业特惠首小时 9.9 RM）
- **系统不处理价格计算**，仅负责预约和座位管理，收入由店家手动录入

## 技术选型

| 项目 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Auth |
| 实时同步 | Supabase Realtime |
| 部署 | Vercel（免费额度） |
| 语言 | TypeScript |

选择理由：一个 Next.js 项目同时承载顾客端和管理后台；Supabase 实时订阅天然解决座位状态同步；冲突检测逻辑在 API Route 服务端执行保证安全性；Vercel 免费部署，免费额度对 4 座位小店绰绰有余。

## 数据模型

### 表 1：available_slots（可预约时间段）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| date | DATE | 日期 |
| start_time | TIME | 开放开始时间 |
| end_time | TIME | 开放结束时间 |
| is_active | BOOLEAN | 是否启用 |

店家设置某天的营业时间范围，顾客只能在此范围内选择预约时间。

### 表 2：bookings（预约记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| slot_id | UUID → available_slots | 关联哪天的开放时间 |
| customer_name | TEXT | 顾客姓名 |
| contact_type | ENUM('wechat', 'whatsapp') | 联系方式类型 |
| contact_value | TEXT | 微信号或 WhatsApp 号码 |
| start_time | TIMESTAMPTZ | 预约开始时间 |
| duration_hours | INTEGER | 预约时长（小时，不限上限） |
| num_people | INTEGER | 人数（1-4） |
| actual_amount | DECIMAL | 实际收款金额（店家手动录入，可为空） |
| status | ENUM('pending', 'confirmed', 'rejected', 'cancelled') | 预约状态 |
| created_at | TIMESTAMPTZ | 创建时间 |

### 表 3：admin_users（管理员）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 关联 Supabase Auth 用户 ID |
| email | TEXT | 登录邮箱 |
| name | TEXT | 管理员名称 |

使用 Supabase Auth 进行登录认证，只有 admin_users 表中的用户才能访问后台。

## 冲突检测逻辑

当顾客提交预约时，API 在服务端执行：

1. 计算预约时间范围：`start_time` 到 `start_time + duration_hours`
2. 查询该时间范围内所有 pending + confirmed 状态的预约
3. 按每个小时统计已占座位数
4. 如果任何小时内「已占座位 + 本次人数 > 4」，拒绝提交并提示座位不足

## 页面结构

### 顾客端（H5 网页，无需登录）

#### 1. 首页 — 选择日期 `/`

- 店铺名称和简介
- 日历组件：可预约日期（绿色）/ 已满（灰色）/ 未开放（不可点击）
- 点击日期进入预约表单

#### 2. 预约表单 `/book?date=YYYY-MM-DD`

- 顶部显示所选日期和剩余座位概览
- 时间轴可视化：每个小时的座位占用情况（如 4/4 已满标红）
- 选择开始时间
- 选择时长（小时数，不限上限，但不能超出当天开放时间范围）
- 选择人数（1-4 人）
- 填写姓名
- 选择联系方式类型（微信 / WhatsApp）+ 填写号码
- 不显示价格，到店线下结算
- 提交预约按钮

#### 3. 预约状态页 `/booking/[id]`

- 显示预约详情（日期、时间、时长、人数）
- 实时状态更新：⏳ 待确认 → ✅ 已确认 / ❌ 已拒绝
- Supabase 实时订阅，店家操作后页面自动更新
- 提交成功后生成此页面链接，顾客可保存查看

### 管理后台（需登录，移动端优先）

#### 1. 预约列表 `/admin`

- 今日预约卡片列表
- 按日期筛选
- 按状态筛选（pending / confirmed / rejected / cancelled）
- 一键确认 / 拒绝 / 取消
- 确认或完成后可输入实际收款金额
- 新预约实时推送提醒（Supabase Realtime）

#### 2. 时间管理 `/admin/slots`

- 日历视图选择日期
- 设置开放时间范围（开始-结束时间）
- 快捷操作：批量设置一周
- 启用 / 停用某天

#### 3. 数据统计 `/admin/stats`

- 今日 / 本周 / 本月预约人数
- 今日 / 本周 / 本月收入（基于手动录入的 actual_amount）
- 简单图表展示趋势

#### 4. 登录页 `/admin/login`

- 邮箱 + 密码登录
- Supabase Auth 处理
- 登录后跳转预约列表

## 预约流程

1. 店家在后台设置可预约的日期和时间范围
2. 顾客打开 H5 页面，日历显示实时可用日期
3. 顾客选日期 → 查看座位时间轴 → 选时间/时长/人数 → 填写姓名和联系方式 → 提交
4. 系统执行冲突检测，通过后创建 pending 状态的预约
5. 店家在后台收到新预约通知，确认或拒绝
6. 顾客在预约状态页实时看到结果
7. 顾客到店，线下结算，店家在后台录入实际收款金额

## UI 设计风格

参照品牌海报风格：

- **背景：** 浅灰暖色纹理背景（#F5F0EB）
- **卡片：** 白色卡片承载内容
- **强调色：** 红色（#D32F2F）用于 CTA 按钮和重要信息
- **文字：** 深色（#333333）
- **风格关键词：** 像素风、可爱、活泼、简洁
- **页面可点缀像素风装饰元素**
- **移动端优先：大按钮、大文字、易操作**

## 项目目录结构

```
pindou-booking/
├── app/
│   ├── page.tsx                # 顾客首页（选日期）
│   ├── book/page.tsx           # 预约表单
│   ├── booking/[id]/page.tsx   # 预约状态
│   └── admin/
│       ├── page.tsx            # 预约列表
│       ├── slots/page.tsx      # 时间管理
│       ├── stats/page.tsx      # 数据统计
│       └── login/page.tsx      # 登录
├── components/                  # 共享组件
├── lib/
│   └── supabase.ts             # Supabase 客户端
└── app/api/
    └── bookings/route.ts       # 预约 API（含冲突检测）
```
