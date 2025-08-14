import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from '@/context/toast';
import { AuthProvider } from '@/context/auth';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CakeStack",
  description: "For those passionate about microservices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Prevent scroll restoration on page load
            if ('scrollRestoration' in history) {
              history.scrollRestoration = 'manual';
            }
            // Scroll to top on page load
            window.addEventListener('beforeunload', function() {
              window.scrollTo(0, 0);
            });
          `
        }} />
      </body>
    </html>
  );
}
