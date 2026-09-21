import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Country Typeahead',
  description: 'A debounced, keyboard-accessible country search built with the REST Countries API.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
