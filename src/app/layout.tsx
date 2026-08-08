import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cash Flow & Accounting",
  description: "Fase 1 — sistem akuntansi double-entry",
};

const THEME_COOKIE = "theme";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${
        theme === "dark" ? "dark" : ""
      } h-full antialiased`}
      style={{ colorScheme: theme }}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
