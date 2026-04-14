"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getMYTHour } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import type { AvailableSlot, Booking } from "@/lib/types";

const TOTAL_SEATS = 4;

export default function BookPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      }
    >
      <BookPage />
    </Suspense>
  );
}

function BookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date");

  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [numPeople, setNumPeople] = useState(1);
  const [profile, setProfile] = useState<{
    name: string;
    contact_type: "wechat" | "whatsapp";
    contact_value: string;
  } | null>(null);

  useEffect(() => {
    if (!date) return;
    fetchSlotData();
  }, [date]);

  async function fetchSlotData() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace(`/auth/login?from=${encodeURIComponent(`/book?date=${date}`)}`);
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("name, contact_type, contact_value")
      .eq("id", user.id)
      .single();

    if (profileData) setProfile(profileData);

    const { data: slotData } = await supabase
      .from("available_slots")
      .select("*")
      .eq("date", date)
      .eq("is_active", true)
      .single();

    if (slotData) {
      setSlot(slotData);

      const { data: occupancyData } = await supabase.rpc("get_occupancy");
      if (occupancyData) {
        setBookings(
          occupancyData.filter(
            (b: Booking) => b.slot_id === slotData.id
          ) as Booking[]
        );
      }
    }

    setLoading(false);
  }

  function getSeatsUsedAtHour(hour: number): number {
    let used = 0;
    for (const b of bookings) {
      const bHour = getMYTHour(b.start_time);
      const bEnd = bHour + b.duration_hours;
      if (hour >= bHour && hour < bEnd) {
        used += b.num_people;
      }
    }
    return used;
  }

  function getMaxDuration(fromHour: number): number {
    if (!slot) return 0;
    const endHour = parseInt(slot.end_time.split(":")[0]);
    let max = 0;
    for (let h = fromHour; h < endHour; h++) {
      if (getSeatsUsedAtHour(h) + numPeople > TOTAL_SEATS) break;
      max++;
    }
    return max;
  }

  async function handleSubmit() {
    if (!date || startHour === null) return;

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          start_hour: startHour,
          duration_hours: duration,
          num_people: numPeople,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "预约失败");
        setSubmitting(false);
        return;
      }

      router.push(`/booking/${data.booking.id}`);
    } catch {
      setError("网络错误，请稍后重试");
      setSubmitting(false);
    }
  }

  if (!date) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">请先选择日期</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">该日期未开放预约</p>
          <Button onClick={() => router.push("/")} variant="outline">
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  const slotStart = parseInt(slot.start_time.split(":")[0]);
  const slotEnd = parseInt(slot.end_time.split(":")[0]);
  const hours = Array.from(
    { length: slotEnd - slotStart },
    (_, i) => slotStart + i
  );

  const maxDuration = startHour !== null ? getMaxDuration(startHour) : 0;

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-muted-foreground hover:text-foreground mr-3"
        >
          ← 返回
        </button>
        <h1 className="text-lg font-semibold">预约 — {date}</h1>
      </div>

      {/* Time Axis */}
      <Card className="p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">选择开始时间</h2>
        <div className="space-y-2">
          {hours.map((hour) => {
            const used = getSeatsUsedAtHour(hour);
            const available = TOTAL_SEATS - used;
            const canSelect = available >= numPeople;

            return (
              <button
                key={hour}
                disabled={!canSelect}
                onClick={() => {
                  setStartHour(hour);
                  setDuration(1);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all ${
                  startHour === hour
                    ? "bg-primary text-primary-foreground"
                    : canSelect
                      ? "bg-muted hover:bg-muted/80 cursor-pointer"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <span className="font-medium">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span>
                  {canSelect ? (
                    <span
                      className={
                        startHour === hour
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }
                    >
                      剩余 {available} 座
                    </span>
                  ) : (
                    <span className="text-red-400">已满</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Duration & People */}
      {startHour !== null && (
        <Card className="p-4 mb-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                时长（小时）
              </Label>
              <div className="flex gap-2">
                {Array.from({ length: maxDuration }, (_, i) => i + 1).map(
                  (h) => (
                    <button
                      key={h}
                      onClick={() => setDuration(h)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        duration === h
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {h}h
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block">人数</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => {
                  const canSelect =
                    getSeatsUsedAtHour(startHour) + n <= TOTAL_SEATS;
                  return (
                    <button
                      key={n}
                      disabled={!canSelect}
                      onClick={() => {
                        setNumPeople(n);
                        setDuration(1);
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        numPeople === n
                          ? "bg-primary text-primary-foreground"
                          : canSelect
                            ? "bg-muted hover:bg-muted/80"
                            : "bg-gray-100 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {n}人
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Contact Info (from profile) */}
      {startHour !== null && profile && (
        <Card className="p-4 mb-4 bg-muted/30">
          <h2 className="text-sm font-semibold mb-3">联系信息</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">姓名</span>
              <span className="font-medium">{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {profile.contact_type === "whatsapp" ? "WhatsApp" : "微信"}
              </span>
              <span className="font-medium">{profile.contact_value}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Summary & Submit */}
      {startHour !== null && (
        <div className="space-y-3">
          <Card className="p-4 bg-muted/50">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">日期</span>
                <span className="font-medium">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">时间</span>
                <span className="font-medium">
                  {String(startHour).padStart(2, "0")}:00 -{" "}
                  {String(startHour + duration).padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">时长</span>
                <span className="font-medium">{duration} 小时</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">人数</span>
                <span className="font-medium">{numPeople} 人</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-muted-foreground">费用</span>
                <span className="font-medium text-primary">到店结算</span>
              </div>
            </div>
          </Card>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !profile}
            className="w-full h-12 text-base font-semibold"
          >
            {submitting ? "提交中..." : "确认预约"}
          </Button>
        </div>
      )}
    </div>
  );
}
