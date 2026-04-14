"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getMYTHour, getMYTDateStr, getTodayMYT } from "@/lib/timezone";
import type { AvailableSlot, Booking } from "@/lib/types";

const TOTAL_SEATS = 4;

export default function HomePage() {
  const router = useRouter();
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetchData();
    checkAuth();
  }, []);

  async function checkAuth() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setUserName(profile?.name || null);
    }
    setAuthChecked(true);
  }

  async function fetchData() {
    const supabase = createClient();

    const [slotsRes, occupancyRes] = await Promise.all([
      supabase.from("available_slots").select("*").eq("is_active", true),
      supabase.rpc("get_occupancy"),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (occupancyRes.data) setBookings(occupancyRes.data as Booking[]);
    setLoading(false);
  }

  function getDateStatus(dateStr: string): "available" | "full" | "closed" {
    const slot = slots.find((s) => s.date === dateStr);
    if (!slot) return "closed";

    const startHour = parseInt(slot.start_time.split(":")[0]);
    const endHour = parseInt(slot.end_time.split(":")[0]);

    const dayBookings = bookings.filter((b) => {
      return getMYTDateStr(b.start_time) === dateStr;
    });

    for (let hour = startHour; hour < endHour; hour++) {
      let seatsUsed = 0;
      for (const b of dayBookings) {
        const bHour = getMYTHour(b.start_time);
        const bEnd = bHour + b.duration_hours;
        if (hour >= bHour && hour < bEnd) {
          seatsUsed += b.num_people;
        }
      }
      if (seatsUsed < TOTAL_SEATS) return "available";
    }

    return "full";
  }

  function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function formatDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function prevMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

  const todayStr = getTodayMYT();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      {/* Auth nav */}
      <div className="flex justify-end items-center gap-3 text-xs mb-3 h-5">
        {authChecked && userName && (
          <>
            <Link href="/my-bookings" className="text-primary font-medium">
              我的预约
            </Link>
            <span className="text-muted-foreground">|</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground"
              >
                退出（{userName}）
              </button>
            </form>
          </>
        )}
        {authChecked && !userName && (
          <Link href="/auth/login" className="text-primary font-medium">
            登录 / 注册
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground tracking-widest mb-1">
          SHERVIE ART
        </p>
        <h1 className="text-3xl font-bold text-foreground">拼豆岛</h1>
        <p className="text-sm text-muted-foreground mt-1">PINSLAND</p>
        <p className="text-xs text-muted-foreground mt-2">
          JAYAONE | UM · Pacific Star
        </p>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold">
            {year}年{month + 1}月
          </h2>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            →
          </button>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            加载中...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateStr(year, month, day);
              const isPast = dateStr < todayStr;
              const status = isPast ? "closed" : getDateStatus(dateStr);

              return (
                <button
                  key={day}
                  disabled={status === "closed" || status === "full"}
                  onClick={() => router.push(`/book?date=${dateStr}`)}
                  className={`h-10 rounded-lg text-sm font-medium transition-all ${
                    status === "available"
                      ? "bg-green-100 text-green-800 hover:bg-green-200 active:scale-95 cursor-pointer"
                      : status === "full"
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "text-gray-300 cursor-not-allowed"
                  } ${dateStr === todayStr ? "ring-2 ring-primary" : ""}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            <span>可预约</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span>已满</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-gray-200" />
            <span>未开放</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-xs text-muted-foreground">
        <p>自助体验 · 提供拼豆工具 + 221色豆子</p>
        <p className="mt-1">成品带走 · 配件升级 FROM 1RM起</p>
      </div>
    </div>
  );
}
