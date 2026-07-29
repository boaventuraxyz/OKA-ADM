import { LOCAL_FONT_PRELOADS } from "@/lib/fonts";
import "../public-form.css";

export default function FormularioLayout({
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
