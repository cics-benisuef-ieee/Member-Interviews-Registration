import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-source-sans',
});

export const metadata: Metadata = {
  title: 'CS/CIS Beni-Suef Chapter — Member Interviews',
  description: 'Interview queue system for chapter member registration and track interviews.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#002855',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sourceSans.variable)}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
