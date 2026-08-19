import type { Metadata } from "next";
import { LOCAL_FONT_PRELOADS } from "@/lib/fonts";
import "../public-form.css";
import "./preview.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Prévia de tema",
};

export default function ThemePreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {LOCAL_FONT_PRELOADS.map((href) => (
        <link as="font" crossOrigin="anonymous" href={href} key={href} rel="preload" type="font/woff2" />
      ))}
      {children}
    </>
  );
}
