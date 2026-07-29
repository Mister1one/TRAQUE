import type { Metadata } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/get-lang";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jbmono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return lang === "en"
    ? {
        title: "TRAQUE — Find your clients, stop looking for them",
        description:
          "TRAQUE scans your market, scores each prospect, drafts the approach and manages follow-ups. A prospecting tool for freelancers and agencies selling direct.",
      }
    : {
        title: "TRAQUE — Trouvez vos clients, arrêtez de les chercher",
        description:
          "TRAQUE scanne votre marché, note chaque prospect, rédige l'approche et gère les relances. Un outil de prospection pour freelances et agences qui vendent en direct.",
      };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body
        className={`${oswald.variable} ${inter.variable} ${jbmono.variable} font-body bg-paper text-text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
