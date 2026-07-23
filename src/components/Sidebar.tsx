"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserRole } from '../lib/types';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const STUDENT_NAV: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard/student',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    label: 'Take Quiz',
    href: '/quiz',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    label: 'Quiz History',
    href: '/dashboard/student/history',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: 'Meal Plan',
    href: '/dashboard/student/meal-plan',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 3v18M4.5 3v6a3.75 3.75 0 007.5 0V3M19.5 3v18M19.5 3a3 3 0 013 3v3a3 3 0 01-3 3"
      />
    ),
  },
];

const TEACHER_NAV: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard/teacher',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    label: 'Students',
    href: '/dashboard/teacher/students',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4"
      />
    ),
  },
];

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return initials || '?';
}

type Props = {
  role: UserRole;
  userName: string;
};

export default function Sidebar({ role, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const items = role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth');
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
          M
        </div>
        <span className="text-sm font-semibold text-slate-900 leading-tight">
          Adaptive Math
          <br />
          Diagnostics
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 shrink-0 ${active ? 'text-sky-600' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
            <p className="text-xs text-slate-400 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
