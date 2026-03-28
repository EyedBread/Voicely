import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voisli",
  description: "Your AI Voice Assistant — powered by Gemini Live",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex">
        {/* Background decorative glow */}
        <div className="bg-glow" style={{ width: 600, height: 600, top: -100, right: -200 }} />
        <div className="bg-glow" style={{ width: 400, height: 400, bottom: -100, left: "30%" }} />

        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area — left margin for desktop sidebar, bottom padding for mobile nav */}
        <main className="flex-1 min-h-screen md:ml-20 pb-16 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
