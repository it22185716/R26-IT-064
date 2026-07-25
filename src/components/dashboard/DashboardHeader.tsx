'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { UserRole } from '../../lib/types';

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
  title: string;
  userName: string;
  onMenuClick?: () => void;
};

export default function DashboardHeader({ role, title, userName, onMenuClick }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth');
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-white/20 bg-white/25 px-4 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-inset ring-white/10 backdrop-blur-xl sm:px-6">
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3">
        <a
          href={role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student'}
          className="group flex items-center gap-2.5 justify-self-start transition-opacity duration-200 hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="Hayagiri International Buddhist College crest"
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <span className="hidden bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 bg-clip-text text-base font-extrabold tracking-tight text-transparent sm:inline">
            Hayagiri AI Learning Platform
          </span>
        </a>

        <div className="hidden justify-self-center text-sm font-semibold text-slate-700 sm:block">{title}</div>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/40 bg-white/30 text-slate-700 backdrop-blur-md transition-colors hover:border-white/60 hover:bg-white/50 md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-white/40 bg-white/30 py-1 pl-1 pr-1.5 backdrop-blur-md sm:gap-2.5 sm:pl-1.5 sm:pr-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-semibold text-white shadow-sm">
              {getInitials(userName)}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="max-w-[9rem] truncate text-sm font-medium text-slate-900">{userName}</p>
              <p className="text-[11px] capitalize text-slate-500">{role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/40 bg-white/30 text-slate-600 backdrop-blur-md transition-colors hover:border-rose-200 hover:bg-rose-50/80 hover:text-rose-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
