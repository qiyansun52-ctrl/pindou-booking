-- ============================================
-- PINSLAND 拼豆岛 - 顾客登录系统
-- ============================================

-- 1. 清空已有测试预约
truncate bookings;

-- 2. bookings 加 user_id 关联 auth.users
alter table bookings
  add column user_id uuid not null references auth.users(id) on delete cascade;

create index idx_bookings_user_id on bookings(user_id);

-- 3. 顾客资料表
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  contact_type text not null check (contact_type in ('wechat', 'whatsapp')),
  contact_value text not null,
  created_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- user_profiles: 用户读写自己
create policy "Users can read own profile"
  on user_profiles for select
  using (id = auth.uid());

create policy "Users can insert own profile"
  on user_profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on user_profiles for update
  using (id = auth.uid());

-- user_profiles: admin 可读所有
create policy "Admin can read all profiles"
  on user_profiles for select
  using (exists (select 1 from admin_users where id = auth.uid()));

-- ============================================
-- 替换 bookings 的 RLS 策略
-- ============================================

drop policy if exists "Anyone can create a booking" on bookings;
drop policy if exists "Anyone can read booking by id" on bookings;

-- 已登录用户可以给自己创建预约
create policy "Authenticated users can create own booking"
  on bookings for insert
  with check (user_id = auth.uid());

-- 已登录用户可读自己的预约
create policy "Users can read own bookings"
  on bookings for select
  using (user_id = auth.uid());

-- admin 可读所有预约
create policy "Admin can read all bookings"
  on bookings for select
  using (exists (select 1 from admin_users where id = auth.uid()));

-- ============================================
-- 公共座位占用 RPC（不暴露顾客 PII）
-- ============================================

create or replace function get_occupancy()
returns table (
  slot_id uuid,
  start_time timestamptz,
  duration_hours integer,
  num_people integer
)
language sql
security definer
set search_path = public
as $$
  select slot_id, start_time, duration_hours, num_people
  from bookings
  where status in ('pending', 'confirmed');
$$;

grant execute on function get_occupancy() to anon, authenticated;
