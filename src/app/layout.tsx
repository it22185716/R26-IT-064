import '../styles/globals.css';

export const metadata = {
  title: 'Adaptive Math Diagnostics',
  description: 'Adaptive testing and diagnostics for Grade 7 & 8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  );
}
