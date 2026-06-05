import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/app/providers";
import { getStaticMetadata } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = getStaticMetadata("en", "default");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
