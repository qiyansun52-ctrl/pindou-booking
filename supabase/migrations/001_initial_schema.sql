-- ============================================
-- PINSLAND 拼豆岛 预约系统 - 数据库初始化
-- ============================================

-- 1. 可预约时间段
create table available_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  constraint unique_slot_per_date unique (date)
);

-- 2. 预约记录
create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references available_slots(id) on delete cascade,
  customer_name text not null,
  contact_type text not null check (contact_type in ('wechat', 'whatsapp')),
  contact_value text not null,
  start_time timestamptz not null,
  duration_hours integer not null check (duration_hours >= 1),
  num_people integer not null check (num_people >= 1 and num_people <= 4),
  actual_amount decimal(10, 2),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 3. 管理员
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null
);

-- ============================================
-- Row Level Security
-- ============================================

alter table available_slots enable row level security;
alter table bookings enable row level security;
alter table admin_users enable row level security;

-- available_slots: 所有人可读 active 的记录
create policy "Anyone can read active slots"
  on available_slots for select
  using (is_active = true);

-- available_slots: admin 可以做所有操作
create policy "Admin full access to slots"
  on available_slots for all
  using (
    exists (select 1 from admin_users where id = auth.uid())
  );

-- bookings: 任何人可以插入（提交预约）
create policy "Anyone can create a booking"
  on bookings for insert
  with check (true);

-- bookings: 任何人可以通过 id 读取单条预约（用于状态页）
create policy "Anyone can read booking by id"
  on bookings for select
  using (true);

-- bookings: admin 可以更新预约（确认/拒绝/取消/录入金额）
create policy "Admin can update bookings"
  on bookings for update
  using (
    exists (select 1 from admin_users where id = auth.uid())
  );

-- bookings: admin 可以删除预约
create policy "Admin can delete bookings"
  on bookings for delete
  using (
    exists (select 1 from admin_users where id = auth.uid())
  );

-- admin_users: 只有自己可以读
create policy "Admin can read own record"
  on admin_users for select
  using (id = auth.uid());

-- ============================================
-- Enable Realtime
-- ============================================

alter publication supabase_realtime add table bookings;

-- ============================================
-- Indexes
-- ============================================

create index idx_slots_date on available_slots(date);
create index idx_bookings_slot_id on bookings(slot_id);
create index idx_bookings_status on bookings(status);
create index idx_bookings_start_time on bookings(start_time);
