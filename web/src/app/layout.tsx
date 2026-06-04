import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Briefly AI — Tu briefing ejecutivo diario',
  description: 'Resúmenes automáticos de tus emails, documentos y calendario, generados por IA.',
  openGraph: {
    title: 'Briefly AI',
    description: 'Tu briefing ejecutivo diario, generado por IA.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-neutral-950 text-neutral-100 antialiased min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1c1c1e',
              color: '#f5f5f7',
              border: '1px solid #2c2c2e',
            },
          }}
        />
      </body>
    </html>
  );
}
