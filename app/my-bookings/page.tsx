"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getMYTHour, getMYTDateStr } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Booking, BookingStatus } from "@/lib/types";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  rejected: "已拒绝",
  cancelled: "已取消",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: false });

    if (data) setBookings(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push("/")}
            className="text-muted-foreground hover:text-foreground mr-3"
          >
            ← 返回
          </button>
          <h1 className="text-lg font-semibold">我的预约</h1>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : bookings.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">还没有预约记录</p>
          <Link href="/">
            <Button>去预约</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const dateStr = getMYTDateStr(b.start_time);
            const startHour = getMYTHour(b.start_time);
            const endHour = startHour + b.duration_hours;
            return (
              <Link key={b.id} href={`/booking/${b.id}`}>
                <Card className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{dateStr}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CLASS[b.status]}`}
                    >
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      时间：{String(startHour).padStart(2, "0")}:00 -{" "}
                      {String(endHour).padStart(2, "0")}:00（
                      {b.duration_hours}h）
                    </div>
                    <div>人数：{b.num_people} 人</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
