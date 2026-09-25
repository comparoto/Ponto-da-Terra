import { Providers } from './providers';

export const metadata = {
  title: 'Ponto da Terra',
  description: 'Plataforma de artesanato pernambucano',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}