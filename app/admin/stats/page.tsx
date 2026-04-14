"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getMYTDateStr, getTodayMYT } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import type { Booking } from "@/lib/types";

export default function AdminStatsPage() {
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
      .in("status", ["confirmed", "pending"]);

    if (data) setBookings(data);
    setLoading(false);
  }

  function getStats(filterFn: (mytDate: string) => boolean) {
    const filtered = bookings.filter((b) => filterFn(getMYTDateStr(b.start_time)));
    const people = filtered.reduce((sum, b) => sum + b.num_people, 0);
    const revenue = filtered.reduce(
      (sum, b) => sum + (b.actual_amount || 0),
      0
    );
    const count = filtered.length;
    return { people, revenue, count };
  }

  const todayStr = getTodayMYT();

  // Today
  const todayStats = getStats((d) => d === todayStr);

  // This week (Monday to Sunday)
  const todayDate = new Date(todayStr + "T00:00:00+08:00");
  const dayOfWeek = todayDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStartDate = new Date(todayDate);
  weekStartDate.setDate(todayDate.getDate() - mondayOffset);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 7);
  const weekStartStr = weekStartDate.toISOString().split("T")[0];
  const weekEndStr = weekEndDate.toISOString().split("T")[0];

  const weekStats = getStats((d) => d >= weekStartStr && d < weekEndStr);

  // This month
  const monthPrefix = todayStr.slice(0, 7); // "YYYY-MM"
  const monthStats = getStats((d) => d.startsWith(monthPrefix));

  // Last 7 days daily breakdown for simple chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const dailyData = last7Days.map((dateStr) => {
    const dayBookings = bookings.filter(
      (b) => getMYTDateStr(b.start_time) === dateStr
    );
    return {
      date: dateStr.slice(5), // MM-DD
      people: dayBookings.reduce((sum, b) => sum + b.num_people, 0),
      revenue: dayBookings.reduce(
        (sum, b) => sum + (b.actual_amount || 0),
        0
      ),
    };
  });

  const maxPeople = Math.max(...dailyData.map((d) => d.people), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">今日</p>
          <p className="text-xl font-bold">{todayStats.people}</p>
          <p className="text-xs text-muted-foreground">人</p>
          <p className="text-sm font-semibold text-primary mt-1">
            RM {todayStats.revenue.toFixed(1)}
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">本周</p>
          <p className="text-xl font-bold">{weekStats.people}</p>
          <p className="text-xs text-muted-foreground">人</p>
          <p className="text-sm font-semibold text-primary mt-1">
            RM {weekStats.revenue.toFixed(1)}
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">本月</p>
          <p className="text-xl font-bold">{monthStats.people}</p>
          <p className="text-xs text-muted-foreground">人</p>
          <p className="text-sm font-semibold text-primary mt-1">
            RM {monthStats.revenue.toFixed(1)}
          </p>
        </Card>
      </div>

      {/* Simple bar chart */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-4">近 7 天预约人数</h2>
        <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
          {dailyData.map((day) => {
            const height = maxPeople > 0 ? (day.people / maxPeople) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <span className="text-xs font-medium mb-1">
                  {day.people || ""}
                </span>
                <div
                  className="w-full bg-primary rounded-t transition-all"
                  style={{
                    height: `${Math.max(height, day.people > 0 ? 4 : 0)}%`,
                    minHeight: day.people > 0 ? 4 : 0,
                  }}
                />
                <span className="text-xs text-muted-foreground mt-1">
                  {day.date}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Revenue chart */}
      <Card className="p-4 mt-3">
        <h2 className="text-sm font-semibold mb-4">近 7 天收入 (RM)</h2>
        <div className="space-y-2">
          {dailyData.map((day) => {
            const maxRevenue = Math.max(
              ...dailyData.map((d) => d.revenue),
              1
            );
            const width = (day.revenue / maxRevenue) * 100;
            return (
              <div key={day.date} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12">
                  {day.date}
                </span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(width, day.revenue > 0 ? 8 : 0)}%` }}
                  >
                    {day.revenue > 0 && (
                      <span className="text-xs text-primary-foreground font-medium">
                        {day.revenue.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
