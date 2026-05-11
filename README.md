# PINSLAND Booking · 拼豆岛预约系统

> A mobile-first booking platform for a 4-seat DIY perler-bead studio in Kuala Lumpur — calendar selection, hourly seat-level conflict detection, admin moderation, and real-time updates.
>
> 为马来西亚吉隆坡一家 4 座的「拼豆」自助体验店打造的预约系统，移动端优先，按小时检测座位冲突，管理员后台审核 + 实时同步。

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20RLS-3ecf8e)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](#license)

---

## What is "Pindou"? · 什么是拼豆？

**Pindou (拼豆)** is the Chinese name for **perler / Hama beads** — small fusible plastic beads arranged on a pegboard to form pixel-art designs, then ironed to fuse together. The shop, **拼豆岛 PINSLAND** (operated by SHERVIE ART, located in KL's JAYAONE | UM · Pacific Star), offers a self-service experience: customers book a seat, the shop provides the tools and 221 colors of beads, and customers take their finished art home.

This repo is the online booking platform that replaced ad-hoc WhatsApp coordination.

## Problem · 解决的问题

Before this system, customers booked via WhatsApp DM. With only **4 physical seats**, this created three recurring pains:

- **Manual conflict checking** — the shop had to mentally track who booked what hour, with what group size.
- **No customer self-serve** — every booking became a back-and-forth chat.
- **Lost bookings** — overlapping requests were missed during busy periods.

The system replaces this with a public mobile-first calendar, server-side hourly conflict detection, and an admin dashboard with live notifications.

## Features · 功能

### Customer side · 顾客端
- **Month-view calendar** showing each date as `available` / `full` / `closed`, computed live from open hours + current bookings.
- **Hourly time picker** that surfaces remaining seats for each hour (out of 4 total).
- **Duration + party size selection** (1+ hours, 1–4 people) with dynamic max-duration based on downstream seat availability.
- **Email-based auth** (Supabase) with stored contact profile (WeChat or WhatsApp).
- **"My bookings"** page with status history (pending / confirmed / rejected / cancelled).

### Admin side · 管理员端
- **Open / close dates** via the slots manager.
- **Booking moderation** — confirm, reject, or cancel any request; record actual payment amount.
- **Stats dashboard** for at-a-glance volume.
- **Real-time push** — Supabase Realtime channel + browser `Notification` API + audio cue when a new booking lands.

### Notifications · 通知
- **Resend** email to the admin on every new booking (optional, env-gated).
- Browser push for the admin while the dashboard is open.

## Tech stack · 技术栈

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui + Base UI |
| Calendar UI | `react-day-picker` |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password, cookie sessions via `@supabase/ssr`) |
| Realtime | Supabase Realtime (postgres_changes) |
| Email | Resend |
| Timezone | Malaysia Time (MYT, UTC+8) — handled by a small `lib/timezone.ts` helper |
| Deployment | Vercel |

> **Note on Next.js version**: this project tracks **Next.js 16.2.3 / React 19.2.4** — note in particular that the auth gate lives in `proxy.ts` (not `middleware.ts`) and exports a `proxy()` function. See [`AGENTS.md`](./AGENTS.md).

## Architecture · 架构

- **Auth gating.** `proxy.ts` (this Next.js's equivalent of middleware) gates `/admin/*` against the `admin_users` allowlist, and `/book` + `/my-bookings/*` against an authenticated session. Unauthenticated customers are redirected back to the original URL after login.
- **Conflict detection.** All seat-availability logic runs server-side in `app/api/bookings/route.ts`. For each hour in the requested range, the API sums `num_people` across overlapping bookings and rejects with HTTP 409 if `used + requested > 4`. A 5-minute duplicate-submission guard catches accidental double-clicks.
- **Privacy.** Occupancy data for the public calendar comes from a `get_occupancy()` Postgres function (SECURITY DEFINER) that returns only `slot_id / start_time / duration / num_people` — never names or contact info. RLS otherwise restricts all PII tables.
- **Realtime.** The admin dashboard subscribes to `bookings` via Supabase Realtime (`postgres_changes`) and surfaces new requests with a browser notification and audio cue.

## Quick start · 快速开始

### 1. Install · 安装依赖

```bash
git clone https://github.com/qiyansun52-ctrl/pindou-booking.git
cd pindou-booking
pnpm install      # or: npm install
```

### 2. Environment · 环境变量

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional — admin email notifications
RESEND_API_KEY=...
ADMIN_NOTIFICATION_EMAIL=you@example.com
```

### 3. Database · 初始化数据库

In the Supabase SQL editor, run in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_auth_system.sql
```

### 4. Create an admin · 创建管理员账号

Register a normal account through the app, then in the Supabase SQL editor:

```sql
insert into admin_users (id, email, name)
values ('<your-auth-user-uuid>', 'you@example.com', 'Your Name');
```

### 5. Run · 启动

```bash
pnpm dev          # or: npm run dev
```

Open <http://localhost:3000>.

## Project structure · 目录结构

```
app/
├── page.tsx                  # Public calendar
├── book/page.tsx             # Hour picker + booking form
├── booking/[id]/page.tsx     # Booking detail / status
├── my-bookings/page.tsx      # Customer history
├── auth/                     # login / register / signout
├── admin/
│   ├── page.tsx              # Bookings list with realtime updates
│   ├── slots/page.tsx        # Open / close dates
│   ├── stats/page.tsx        # Stats dashboard
│   └── login/page.tsx
├── api/bookings/route.ts     # Server-side booking creation + conflict check
└── layout.tsx

components/ui/                # shadcn/ui primitives (button, card, calendar, ...)

lib/
├── supabase.ts               # Browser client
├── supabase-server.ts        # Server client (cookie-aware)
├── timezone.ts               # MYT (UTC+8) helpers
├── notify.ts                 # Resend email
├── types.ts                  # Shared TS types
└── utils.ts

proxy.ts                      # Auth gate (this Next.js's middleware)
supabase/migrations/          # SQL schema + RLS + RPC
```

### Data model · 数据表

| Table | Purpose |
|---|---|
| `available_slots` | Per-day open hours (admin-configured). |
| `bookings` | Customer bookings, linked to `auth.users`. |
| `user_profiles` | Customer name + contact (WeChat / WhatsApp). |
| `admin_users` | Allowlist for admin routes. |

All tables have RLS enabled. Seat occupancy for the public calendar is exposed only via the `get_occupancy()` RPC, which strips PII.

## Deployment · 部署

The project is built for **Vercel**:

1. Import the repo on Vercel.
2. Add the same env vars from `.env.local`.
3. Deploy. The Vercel free tier is comfortably enough for a 4-seat shop.

For Supabase, the free tier covers everything used here (Postgres + Auth + Realtime).

## Roadmap · 状态与规划

**Status:** functional end-to-end — calendar, booking, auth, admin moderation, realtime notifications, and Resend emails are all wired up. Currently single-shop, single-language UI (Simplified Chinese).

Possible next steps:

- [ ] Public deployment + screenshots in this README
- [ ] English UI toggle
- [ ] SMS / WhatsApp notification to customers on status change
- [ ] Multi-shop support (currently one `available_slots` row per date)
- [ ] Optional in-app pricing / payment instead of pay-at-store
- [ ] E2E tests (Playwright) for the booking flow

## Design notes · 设计取舍

- **No price calculation.** The shop runs promotional pricing and bundles; the system records `actual_amount` after the visit rather than quoting up front.
- **Hour granularity.** Bookings align to whole hours, matching how the shop thinks about the room and keeping conflict math trivial.
- **`proxy.ts` not `middleware.ts`.** Next.js 16 convention used by this project; the exported function is `proxy()`, not `middleware()`. See `AGENTS.md`.

## License

[MIT](./LICENSE) — feel free to use as a reference.

---

_Built as a real production tool for a friend's shop, then polished into a portfolio piece._
_为朋友的小店做的实际产品，顺便整理成作品集项目。_
