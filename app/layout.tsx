import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThermoTag SE | Cadeia de frio rastreável",
  description: "Check-ins, alertas térmicos e passaporte digital de cargas em Sergipe.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
