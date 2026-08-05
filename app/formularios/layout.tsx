import type { Metadata } from "next";
import { LOCAL_FONT_PRELOADS } from "@/lib/fonts";
import "../public-form.css";

export const metadata: Metadata = {
  description: "Abaixo-assinados e mobilizacoes publicas.",
  title: "Abaixo-assinados"
};

export default function FormulariosLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {LOCAL_FONT_PRELOADS.map((href) => (
        <link
          as="font"
          crossOrigin="anonymous"
          href={href}
          key={href}
          rel="preload"
          type="font/woff2"
        />
      ))}
      {children}
    </>
  );
}
