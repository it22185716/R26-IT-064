import '../styles/globals.css';

export const metadata = {
  title: 'Hayagiri International Buddhist College | AI Learning Platform',
  description:
    'An AI-powered learning platform for Hayagiri International Buddhist College, Kandy — personalized nutrition, math gap detection, reading assessment, and adaptive content delivery for Grade 7 students.',
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
