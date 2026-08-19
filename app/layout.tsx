import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/source-serif-4/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return process.env.APP_URL ? new URL(process.env.APP_URL) : undefined;
    } catch {
      return undefined;
    }
  })(),
  applicationName: "OKA",
  title: { default: "OKA", template: "%s | OKA" },
  description: "Plataforma de campanhas e mobilização cidadã"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
