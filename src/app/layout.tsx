import type { Metadata } from 'next';
import { Provider } from '../components/provider';
import '../index.css';
import '../App.css';

export const metadata: Metadata = {
  title: 'Ponto da Terra',
  description: 'Aplicação Ponto da Terra',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}