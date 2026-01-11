import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalRadioButton from "./components/GlobalRadioButton";
import { StoreProvider } from "./lib/store-context";
import { ThemeProvider } from "./components/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { PLATFORM_NAME } from "./lib/constants";

export const metadata: Metadata = {
  title: PLATFORM_NAME,
  description: `${PLATFORM_NAME} Platform`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <StoreProvider>
          <ThemeProvider>
            {/* <GlobalRadioButton /> */}
            {children}
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
