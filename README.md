# 拼豆岛 PINSLAND — 在线预约系统

SHERVIE ART 旗下拼豆自助体验店的预约平台，位于马来西亚 JAYAONE | UM · Pacific Star。

顾客通过日历选择空闲日期，选择开始时间、时长与人数，完成预约后到店自助体验拼豆乐趣。

---

## 功能

**顾客端**
- 月历视图，实时显示可预约 / 已满 / 未开放日期
- 按小时选择开始时间，剩余座位实时更新
- 选择时长（1 小时起）与人数（最多 4 人）
- 邮箱注册登录，绑定微信或 WhatsApp 联系方式
- 「我的预约」页面查看历史预约状态

**管理员端**
- 管理可预约时间段（开放/关闭日期）
- 确认、拒绝或取消预约，录入实际消费金额
- 预约统计看板

**通知**
- 新预约自动发送邮件通知给管理员（via Resend）

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 15 (App Router) |
| 样式 | Tailwind CSS + shadcn/ui |
| 数据库 / 认证 | Supabase (PostgreSQL + Auth + RLS) |
| 邮件通知 | Resend |
| 时区 | Malaysia Time (MYT, UTC+8) |
| 部署 | Vercel |

---

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/qiyansun52-ctrl/pindou-booking.git
cd pindou-booking
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key          # 可选，用于邮件通知
ADMIN_NOTIFICATION_EMAIL=your_email@example.com  # 可选
```

### 3. 初始化数据库

在 Supabase SQL 编辑器中依次执行：

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_auth_system.sql
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 目录结构

```
app/
├── page.tsx              # 首页日历
├── book/page.tsx         # 预约表单
├── booking/[id]/         # 预约状态页
├── my-bookings/          # 我的预约
├── auth/                 # 登录 / 注册 / 退出
├── admin/                # 管理员后台
│   ├── page.tsx          # 预约列表
│   ├── slots/page.tsx    # 时间段管理
│   └── stats/page.tsx    # 统计看板
└── api/bookings/route.ts # 预约 API

lib/
├── supabase.ts           # 客户端 Supabase
├── supabase-server.ts    # 服务端 Supabase
├── timezone.ts           # MYT 时区工具
├── notify.ts             # Resend 邮件通知
└── types.ts              # TypeScript 类型

supabase/migrations/
├── 001_initial_schema.sql  # 初始表结构 + RLS
└── 002_auth_system.sql     # 顾客登录系统
```

---

## 数据库说明

| 表 | 说明 |
|----|------|
| `available_slots` | 每日开放时间段（管理员配置） |
| `bookings` | 预约记录，关联用户 |
| `user_profiles` | 顾客资料（姓名、联系方式） |
| `admin_users` | 管理员账号 |

所有表均启用 Row Level Security（RLS）。座位占用通过 `get_occupancy()` RPC 函数查询，不暴露顾客个人信息。

---

## 创建管理员账号

在 Supabase Auth 中注册账号后，在 SQL 编辑器执行：

```sql
insert into admin_users (id, email, name)
values ('your-user-uuid', 'your@email.com', '管理员名字');
```

---

## License

MIT
