// [V0.A1] Root layout for ForgeOS editor
import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'ForgeOS - AI Creative Operating System',
  description:
    'Browser-based creative suite with AI-assisted design, animation, and procedural generation.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://forgeos.app',
    title: 'ForgeOS',
    description: 'AI-First Creative Operating System',
    siteName: 'ForgeOS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0c0c0c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
