import { SiteHeader } from "@/components/SiteHeader";
import { SupabaseSessionProvider } from "@/components/SupabaseSessionProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IELTS Writing App",
  description: "Practice IELTS writing tasks with AI scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SupabaseSessionProvider>
          <SiteHeader />
          <main>{children}</main>
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}
