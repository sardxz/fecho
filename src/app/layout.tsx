import type { Metadata } from "next";
import { Capriola } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const capriola = Capriola({
  variable: "--font-sans",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fechô — Pare de cobrar seu grupo no WhatsApp",
    template: "%s",
  },
  description:
    "O Fechô organiza pagamentos, pendências e comprovantes de grupos pequenos num único painel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${capriola.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
