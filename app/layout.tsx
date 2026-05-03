import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { CatalogProvider } from "@/components/providers/catalog-provider";

const prompt = Prompt({
  variable: "--font-sans",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "STACK BOX",
  description: "3D cargo box planner built with React Three Fiber and Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${prompt.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <CatalogProvider>
              {children}
            </CatalogProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
