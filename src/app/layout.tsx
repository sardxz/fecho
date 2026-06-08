import type { Metadata } from "next";
import { Sniglet } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const sniglet = Sniglet({
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
  // Tracking do Umami: lido do ambiente em runtime (não NEXT_PUBLIC, então não
  // precisa de build arg). Só injeta o script quando as duas envs existem —
  // assim a app sobe normal antes de o website ser criado no painel do Umami.
  const umamiSrc = process.env.UMAMI_SCRIPT_URL;
  const umamiId = process.env.UMAMI_WEBSITE_ID;

  return (
    <html lang="pt-BR" className={`${sniglet.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
        {umamiSrc && umamiId && (
          <Script src={umamiSrc} data-website-id={umamiId} defer />
        )}
      </body>
    </html>
  );
}
