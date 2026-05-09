import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/auth/theme-provider";

export const metadata: Metadata = {
  title: "TeachShare",
  description: "TeachShare is a collaborative workspace for classes, resources, discussion, and lesson planning.",
  icons: {
    icon: "/favicon.svg",
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
