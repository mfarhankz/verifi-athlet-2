import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CompAccessProvider } from "../utils/compAccessUtils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Verified Athletics Roster Management",
  description: "Verified Athletics Roster Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CompAccessProvider>
          {children}
        </CompAccessProvider>
      </body>
    </html>
  );
}