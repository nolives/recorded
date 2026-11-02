import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recorded",
  description: "A diary for the albums you listen to.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader user={user} />
        {children}
      </body>
    </html>
  );
}
