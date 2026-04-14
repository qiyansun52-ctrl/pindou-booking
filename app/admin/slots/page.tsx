"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvailableSlot } from "@/lib/types";

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Single day form
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("10:00");
  const [newEnd, setNewEnd] = useState("20:00");

  // Batch form
  const [showBatch, setShowBatch] = useState(false);
  const [batchFrom, setBatchFrom] = useState("");
  const [batchTo, setBatchTo] = useState("");
  const [batchStart, setBatchStart] = useState("10:00");
  const [batchEnd, setBatchEnd] = useState("20:00");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    const supabase = createClient();
    const { data } = await supabase
      .from("available_slots")
      .select("*")
      .order("date", { ascending: true });

    if (data) setSlots(data);
    setLoading(false);
  }

  async function addSlot() {
    if (!newDate) return;
    setSaving(true);

    const supabase = createClient();
    await supabase.from("available_slots").upsert(
      {
        date: newDate,
        start_time: newStart,
        end_time: newEnd,
        is_active: true,
      },
      { onConflict: "date" }
    );

    setNewDate("");
    await fetchSlots();
    setSaving(false);
  }

  async function batchAdd() {
    if (!batchFrom || !batchTo) return;
    setSaving(true);

    const supabase = createClient();
    const from = new Date(batchFrom);
    const to = new Date(batchTo);
    const slotsToInsert = [];

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      slotsToInsert.push({
        date: dateStr,
        start_time: batchStart,
        end_time: batchEnd,
        is_active: true,
      });
    }

    if (slotsToInsert.length > 0) {
      await supabase
        .from("available_slots")
        .upsert(slotsToInsert, { onConflict: "date" });
    }

    setShowBatch(false);
    setBatchFrom("");
    setBatchTo("");
    await fetchSlots();
    setSaving(false);
  }

  async function toggleSlot(slot: AvailableSlot) {
    const supabase = createClient();
    await supabase
      .from("available_slots")
      .update({ is_active: !slot.is_active })
      .eq("id", slot.id);
    fetchSlots();
  }

  async function deleteSlot(id: string) {
    const supabase = createClient();
    await supabase.from("available_slots").delete().eq("id", id);
    fetchSlots();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  // Show upcoming slots (today and future)
  const today = new Date().toISOString().split("T")[0];
  const upcomingSlots = slots.filter((s) => s.date >= today);

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Add single day */}
      <Card className="p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">添加开放日期</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block">日期</Label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">开始时间</Label>
              <Input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1 block">结束时间</Label>
              <Input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={addSlot}
              disabled={saving || !newDate}
              className="flex-1"
            >
              {saving ? "保存中..." : "添加"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBatch(!showBatch)}
              className="flex-1"
            >
              批量设置
            </Button>
          </div>
        </div>
      </Card>

      {/* Batch form */}
      {showBatch && (
        <Card className="p-4 mb-4 border-primary">
          <h2 className="text-sm font-semibold mb-3">批量设置</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">从</Label>
                <Input
                  type="date"
                  value={batchFrom}
                  onChange={(e) => setBatchFrom(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1 block">到</Label>
                <Input
                  type="date"
                  value={batchTo}
                  onChange={(e) => setBatchTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">开始时间</Label>
                <Input
                  type="time"
                  value={batchStart}
                  onChange={(e) => setBatchStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1 block">结束时间</Label>
                <Input
                  type="time"
                  value={batchEnd}
                  onChange={(e) => setBatchEnd(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={batchAdd}
              disabled={saving || !batchFrom || !batchTo}
              className="w-full"
            >
              {saving ? "保存中..." : "批量添加"}
            </Button>
          </div>
        </Card>
      )}

      {/* Slot list */}
      <h2 className="text-sm font-semibold mb-3">
        已设置的日期（{upcomingSlots.length}）
      </h2>
      {upcomingSlots.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          暂无开放日期
        </p>
      ) : (
        <div className="space-y-2">
          {upcomingSlots.map((slot) => (
            <Card
              key={slot.id}
              className={`p-3 flex items-center justify-between ${
                !slot.is_active ? "opacity-50" : ""
              }`}
            >
              <div>
                <p className="font-medium text-sm">{slot.date}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleSlot(slot)}
                >
                  {slot.is_active ? "停用" : "启用"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteSlot(slot.id)}
                >
                  删除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
