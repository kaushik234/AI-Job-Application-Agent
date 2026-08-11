import React from 'react';
import './globals.css';

export const metadata = {
  title: 'SENTINEL AI - Autonomous Job Application Agent',
  description: 'AI-Powered Autonomous Job Search, Resume Tailoring, and Application Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
