import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/auth/theme-provider";

export const metadata: Metadata = {
  title: "Maarif Schools Workspace",
  description: "Teacher collaboration workspace for resources, discussion, and lesson planning.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
