import React from 'react';
import './globals.css'; // <-- ESTA LINHA É OBRIGATÓRIA PARA O TAILWIND CARREGAR
import Provider from './providers';

export const metadata = {
  title: 'Mãos de PE - Origem & Tradição',
  description: 'Artesanato e cultura pernambucana',
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