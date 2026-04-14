import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMYTHour, toMYTISOString } from "@/lib/timezone";
import { notifyNewBooking } from "@/lib/notify";
import { NextRequest, NextResponse } from "next/server";

const TOTAL_SEATS = 4;

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const body = await request.json();
  const {
    date,
    start_hour,
    duration_hours,
    num_people,
    customer_name,
    contact_type,
    contact_value,
  } = body;

  // Validate input
  if (
    !date ||
    start_hour === undefined ||
    !duration_hours ||
    !num_people ||
    !customer_name ||
    !contact_type ||
    !contact_value
  ) {
    return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 });
  }

  if (num_people < 1 || num_people > 4) {
    return NextResponse.json(
      { error: "人数必须在 1-4 之间" },
      { status: 400 }
    );
  }

  if (duration_hours < 1) {
    return NextResponse.json(
      { error: "时长至少 1 小时" },
      { status: 400 }
    );
  }

  if (!["wechat", "whatsapp"].includes(contact_type)) {
    return NextResponse.json(
      { error: "联系方式类型无效" },
      { status: 400 }
    );
  }

  // Find the slot for this date
  const { data: slot, error: slotError } = await supabase
    .from("available_slots")
    .select("*")
    .eq("date", date)
    .eq("is_active", true)
    .single();

  if (slotError || !slot) {
    return NextResponse.json(
      { error: "该日期未开放预约" },
      { status: 400 }
    );
  }

  // Validate time range
  const slotStart = parseInt(slot.start_time.split(":")[0]);
  const slotEnd = parseInt(slot.end_time.split(":")[0]);

  if (start_hour < slotStart || start_hour + duration_hours > slotEnd) {
    return NextResponse.json(
      { error: "预约时间超出当天开放范围" },
      { status: 400 }
    );
  }

  // Duplicate check: same name + contact + date + time within last 5 minutes
  const { data: recentDuplicates } = await supabase
    .from("bookings")
    .select("id")
    .eq("slot_id", slot.id)
    .eq("customer_name", customer_name)
    .eq("contact_value", contact_value)
    .in("status", ["pending", "confirmed"])
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (recentDuplicates && recentDuplicates.length > 0) {
    return NextResponse.json(
      { error: "您刚刚已提交过预约，请勿重复提交" },
      { status: 409 }
    );
  }

  // Conflict detection: check seat availability for each hour
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("slot_id", slot.id)
    .in("status", ["pending", "confirmed"]);

  for (let hour = start_hour; hour < start_hour + duration_hours; hour++) {
    let seatsUsed = 0;
    for (const b of existingBookings || []) {
      const bHour = getMYTHour(b.start_time);
      const bEnd = bHour + b.duration_hours;
      if (hour >= bHour && hour < bEnd) {
        seatsUsed += b.num_people;
      }
    }
    if (seatsUsed + num_people > TOTAL_SEATS) {
      return NextResponse.json(
        {
          error: `${hour}:00 时段座位不足（剩余 ${TOTAL_SEATS - seatsUsed} 个座位）`,
        },
        { status: 409 }
      );
    }
  }

  // Create the booking with Malaysia timezone
  const startTimeISO = toMYTISOString(date, start_hour);

  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      slot_id: slot.id,
      customer_name,
      contact_type,
      contact_value,
      start_time: startTimeISO,
      duration_hours,
      num_people,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "预约创建失败，请稍后重试" },
      { status: 500 }
    );
  }

  // Send notification email (non-blocking)
  notifyNewBooking({
    customer_name,
    contact_type,
    contact_value,
    date,
    start_hour,
    duration_hours,
    num_people,
  }).catch(() => {});

  return NextResponse.json({ booking });
}
