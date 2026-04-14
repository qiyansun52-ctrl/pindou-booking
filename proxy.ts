import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PROTECTED = (path: string) =>
  path.startsWith("/admin") && path !== "/admin/login";

const CUSTOMER_PROTECTED = (path: string) =>
  path === "/book" || path.startsWith("/my-bookings");

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminPath = ADMIN_PROTECTED(path);
  const isCustomerPath = CUSTOMER_PROTECTED(path);

  if (!isAdminPath && !isCustomerPath) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    const from = path + (request.nextUrl.search || "");
    url.search = "";
    if (isAdminPath) {
      url.pathname = "/admin/login";
    } else {
      url.pathname = "/auth/login";
      url.searchParams.set("from", from);
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/book", "/my-bookings/:path*"],
};
