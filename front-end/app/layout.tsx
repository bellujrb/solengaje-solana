import "./theme.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

// Disable static generation to prevent SSR issues with Privy
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Solengaje",
    description:
      "Solengaje - Plataforma de campanhas de influenciadores",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-background" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
