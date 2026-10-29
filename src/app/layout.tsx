import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/lib/demo-store";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Ziki — Agent command center",
    template: "%s · Ziki",
  },
  description:
    "A human–agent interaction prototype for Ziki: presence, work and attention in one place.",
  applicationName: "Ziki Agent Command Center",
};

export const viewport: Viewport = {
  themeColor: "#f5f7fb",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
