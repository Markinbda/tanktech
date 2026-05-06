import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tank Tech | Bermuda Water-Tank Cleaning",
  description:
    "Tank Tech platform for homeowners, property managers, and operations teams managing tank cleaning compliance.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_12%_18%,#e0f2fe_0,#f8fafc_35%,#f8fafc_100%)] text-slate-900">
        <div className="flex min-h-screen flex-col">
          <AppNav />
          {children}
        </div>
      </body>
    </html>
  );
}
