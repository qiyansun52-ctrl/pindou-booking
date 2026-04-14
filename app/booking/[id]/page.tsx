"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getMYTHour, getMYTDateStr } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Booking } from "@/lib/types";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: string }
> = {
  pending: { label: "待确认", variant: "secondary", icon: "⏳" },
  confirmed: { label: "已确认", variant: "default", icon: "✅" },
  rejected: { label: "已拒绝", variant: "destructive", icon: "❌" },
  cancelled: { label: "已取消", variant: "outline", icon: "🚫" },
};

export default function BookingStatusPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const supabase = createClient();

    // Initial fetch
    supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setBooking(data);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`booking-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setBooking(payload.new as Booking);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">未找到该预约</p>
          <Button onClick={() => router.push("/")} variant="outline">
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  const status = statusConfig[booking.status] || statusConfig.pending;
  const dateStr = getMYTDateStr(booking.start_time);
  const startHour = getMYTHour(booking.start_time);
  const endHour = startHour + booking.duration_hours;

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground tracking-widest mb-1">
          PINSLAND
        </p>
        <h1 className="text-xl font-bold">预约详情</h1>
      </div>

      {/* Status */}
      <Card className="p-6 mb-4 text-center">
        <div className="text-4xl mb-2">{status.icon}</div>
        <Badge variant={status.variant} className="text-base px-4 py-1">
          {status.label}
        </Badge>
        {booking.status === "pending" && (
          <p className="text-xs text-muted-foreground mt-3">
            店家确认后状态会自动更新，请留意此页面
          </p>
        )}
      </Card>

      {/* Details */}
      <Card className="p-4">
        <div className="text-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">姓名</span>
            <span className="font-medium">{booking.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">日期</span>
            <span className="font-medium">{dateStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">时间</span>
            <span className="font-medium">
              {String(startHour).padStart(2, "0")}:00 -{" "}
              {String(endHour).padStart(2, "0")}:00
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">时长</span>
            <span className="font-medium">{booking.duration_hours} 小时</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">人数</span>
            <span className="font-medium">{booking.num_people} 人</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {booking.contact_type === "whatsapp" ? "WhatsApp" : "微信"}
            </span>
            <span className="font-medium">{booking.contact_value}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-muted-foreground">费用</span>
            <span className="font-medium text-primary">到店结算</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="mt-6 text-center">
        <Button onClick={() => router.push("/")} variant="outline">
          返回首页
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        地址：JAYAONE | UM · Pacific Star
      </p>
    </div>
  );
}
