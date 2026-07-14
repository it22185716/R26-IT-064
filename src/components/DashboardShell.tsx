"use client";

import React from 'react';
import Sidebar from './Sidebar';
import { UserRole } from '../lib/types';

type Props = {
  role: UserRole;
  title: string;
  subtitle?: string;
  userName?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export default function DashboardShell({ role, title, subtitle, userName, action, children }: Props) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={role} userName={userName || ''} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-10 md:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
            </div>
            {action}
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
