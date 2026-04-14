"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function RegisterWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      }
    >
      <RegisterPage />
    </Suspense>
  );
}

function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<"wechat" | "whatsapp">(
    "whatsapp"
  );
  const [contactValue, setContactValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
      }
    );

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!signUpData.user || !signUpData.session) {
      setError(
        "注册失败，该邮箱可能已被注册。如已有账号请直接登录。"
      );
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from("user_profiles").insert(
      {
        id: signUpData.user.id,
        name,
        contact_type: contactType,
        contact_value: contactValue,
      }
    );

    if (profileError) {
      setError("保存资料失败，请稍后重试");
      setSubmitting(false);
      return;
    }

    router.push(from);
    router.refresh();
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">注册账号</h1>
        <p className="text-sm text-muted-foreground mt-1">拼豆岛 PINSLAND</p>
      </div>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm mb-1 block">
              邮箱
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm mb-1 block">
              密码（至少 6 位）
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          <div>
            <Label htmlFor="name" className="text-sm mb-1 block">
              姓名
            </Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
            />
          </div>

          <div>
            <Label className="text-sm mb-2 block">联系方式</Label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setContactType("whatsapp")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  contactType === "whatsapp"
                    ? "bg-green-600 text-white"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setContactType("wechat")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  contactType === "wechat"
                    ? "bg-green-600 text-white"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                微信
              </button>
            </div>
            <Input
              required
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={
                contactType === "whatsapp"
                  ? "请输入 WhatsApp 号码"
                  : "请输入微信号"
              }
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 text-base font-semibold"
          >
            {submitting ? "注册中..." : "注册并登录"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-4">
          已有账号？{" "}
          <Link
            href={`/auth/login?from=${encodeURIComponent(from)}`}
            className="text-primary font-medium"
          >
            去登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
