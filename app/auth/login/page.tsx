"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("邮箱或密码错误");
      setSubmitting(false);
      return;
    }

    router.push(from);
    router.refresh();
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">登录</h1>
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
              密码
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
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
            {submitting ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-4">
          还没账号？{" "}
          <Link
            href={`/auth/register?from=${encodeURIComponent(from)}`}
            className="text-primary font-medium"
          >
            去注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
