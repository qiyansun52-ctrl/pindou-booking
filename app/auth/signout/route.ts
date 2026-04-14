import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  const url = new URL("/", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
