import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GeoTask - Geogis",
  description: "Gerenciamento de Tarefas e Projetos",
  icons: {
    icon: [{ url: "/icon.ico", sizes: "46x46", type: "image/x-icon" }],
    apple: "/icon.ico?v=3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
