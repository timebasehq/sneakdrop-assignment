import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SneakDrop - Limited Edition Drop',
  description: 'High-concurrency sneaker drop reservation system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
