import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "拼豆岛 PINSLAND — 预约",
  description: "拼豆岛 PINSLAND 自助拼豆体验预约系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F5F0EB]">{children}</body>
    </html>
  );
}
