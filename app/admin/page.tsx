"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getMYTHour, getMYTDateStr, getTodayMYT } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Booking, BookingStatus } from "@/lib/types";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "待确认", variant: "secondary" },
  confirmed: { label: "已确认", variant: "default" },
  rejected: { label: "已拒绝", variant: "destructive" },
  cancelled: { label: "已取消", variant: "outline" },
};

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待确认" },
  { value: "confirmed", label: "已确认" },
  { value: "rejected", label: "已拒绝" },
  { value: "cancelled", label: "已取消" },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(() => {
    return getTodayMYT();
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [amountValue, setAmountValue] = useState("");

  useEffect(() => {
    fetchBookings();

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const supabase = createClient();
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const newBooking = payload.new as Booking;
          // Play notification sound
          try {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqR0NsAAA=="
            );
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("新预约!", {
              body: `${newBooking.customer_name} · ${newBooking.num_people}人`,
              icon: "/favicon.ico",
            });
          }
          fetchBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchBookings() {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select("*, available_slots(*)")
      .order("start_time", { ascending: true });

    if (data) setBookings(data);
    setLoading(false);
  }

  async function updateStatus(bookingId: string, status: BookingStatus) {
    const supabase = createClient();
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    fetchBookings();
  }

  async function saveAmount(bookingId: string) {
    const supabase = createClient();
    const amount = parseFloat(amountValue);
    if (isNaN(amount)) return;
    await supabase
      .from("bookings")
      .update({ actual_amount: amount })
      .eq("id", bookingId);
    setEditingAmount(null);
    setAmountValue("");
    fetchBookings();
  }

  const filtered = bookings.filter((b) => {
    const bDate = getMYTDateStr(b.start_time);
    const dateMatch = bDate === filterDate;
    const statusMatch = filterStatus === "all" || b.status === filterStatus;
    return dateMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Date filter */}
      <div className="mb-4">
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterStatus === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Booking cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          该日期暂无预约
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const startHour = getMYTHour(booking.start_time);
            const endHour = startHour + booking.duration_hours;
            const config = statusConfig[booking.status] || statusConfig.pending;

            return (
              <Card key={booking.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{booking.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.contact_type === "whatsapp" ? "WA" : "微信"}:{" "}
                      {booking.contact_value}
                    </p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>

                <div className="text-sm space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">时间</span>
                    <span>
                      {String(startHour).padStart(2, "0")}:00 -{" "}
                      {String(endHour).padStart(2, "0")}:00（{booking.duration_hours}h）
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">人数</span>
                    <span>{booking.num_people} 人</span>
                  </div>
                  {booking.actual_amount !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">收款</span>
                      <span className="font-medium text-primary">
                        RM {booking.actual_amount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount input */}
                {editingAmount === booking.id && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="输入收款金额"
                      value={amountValue}
                      onChange={(e) => setAmountValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => saveAmount(booking.id)}
                    >
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAmount(null)}
                    >
                      取消
                    </Button>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {booking.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(booking.id, "confirmed")}
                      >
                        确认
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(booking.id, "rejected")}
                      >
                        拒绝
                      </Button>
                    </>
                  )}
                  {booking.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingAmount(booking.id);
                          setAmountValue(
                            booking.actual_amount?.toString() || ""
                          );
                        }}
                      >
                        {booking.actual_amount !== null ? "修改金额" : "录入金额"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(booking.id, "cancelled")}
                      >
                        取消预约
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
