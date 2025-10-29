import "./theme.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Solengaje",
    description:
      "Solengaje - Plataforma de campanhas de influenciadores na Morph Holesky Testnet",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
