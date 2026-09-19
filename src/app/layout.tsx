import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Layout } from "../components/Layout";

export const metadata: Metadata = {
  title: "StockApp POS & Gestion de Stock",
  description: "Application de gestion de stock et point de vente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full bg-gray-100 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}
