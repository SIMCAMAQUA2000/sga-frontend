// Arquivo: app/layout.tsx

import type { Metadata } from 'next';
import './globals.css'; // A linha mais importante

export const metadata: Metadata = {
  title: 'Sistema de Gestão de Análises',
  description: 'Aplicação para criar requisições de análises laboratoriais',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}