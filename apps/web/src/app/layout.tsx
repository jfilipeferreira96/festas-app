import { Poppins, Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";
import { getServerSession } from "@/lib/session";
import type { User } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Gestão de Festas Infantis",
  description: "Plataforma de gestão para espaços de festas infantis",
  icons: {
    icon: "/favicon.ico?v=2",
  },
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const user = session?.user as User | null;

  return (
    <html lang="pt-PT">
      <body
        className={`${poppins.variable} ${inter.variable} font-inter`}
        suppressHydrationWarning
      >
        <Providers initialUser={user}>{children}</Providers>
      </body>
    </html>
  );
}
