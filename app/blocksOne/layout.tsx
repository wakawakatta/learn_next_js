import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blokus One Player',
  description: 'Single player Blokus game',
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
