'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { UserRole } from '../../lib/types';

// Student quick-nav — same routes/icons/colors as the "Quick actions"
// cards on the student Overview page (plus Overview itself), sized down
// for the navbar.
const STUDENT_QUICK_LINKS = [
  {
    href: '/',
    title: 'Home',
    accent: 'bg-gradient-to-br from-violet-500 to-purple-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
      />
    ),
  },
  {
    href: '/dashboard/student',
    title: 'Overview',
    accent: 'bg-gradient-to-br from-gold-400 to-gold-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    href: '/quiz',
    title: 'Take Quiz',
    accent: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    href: '/dashboard/student/meal-plan',
    title: 'Meal Plan',
    accent: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 3v18M4.5 3v6a3.75 3.75 0 007.5 0V3M19.5 3v18M19.5 3a3 3 0 013 3v3a3 3 0 01-3 3"
      />
    ),
  },
  {
    href: '/dashboard/student/reading',
    title: 'Reading Practice',
    accent: 'bg-gradient-to-br from-amber-500 to-orange-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
  {
    href: '/dashboard/student/video-recommendation',
    title: 'Video Recommendation',
    accent: 'bg-gradient-to-br from-rose-500 to-pink-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
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
  title: string;
  userName: string;
};

export default function DashboardHeader({ role, title, userName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth');
  }

  return (
    <header
      className={`sticky top-0 z-50 flex h-20 w-full shrink-0 items-center border-b border-black/5 px-6 backdrop-blur-2xl transition-[background-color,box-shadow] duration-200 ease-out sm:px-8 ${
        scrolled ? 'bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)]' : 'bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3">
        <a
          href={role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student'}
          className="group flex items-center gap-2 justify-self-start"
        >
          <Image
            src="/logo.png"
            alt="Hayagiri International Buddhist College crest"
            width={44}
            height={44}
            priority
            className="h-11 w-11 shrink-0 rounded-full border border-gold-500/30 shadow-sm transition-transform duration-200 ease-out group-hover:scale-105"
          />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-gray-900">
              Hayagiri
              <span aria-hidden className="h-1 w-1 rounded-full bg-gold-500" />
            </span>
            <span className="text-sm text-gray-500">AI Learning Platform</span>
          </span>
        </a>

        {role === 'student' ? (
          <nav className="hidden min-w-0 justify-self-center overflow-x-auto sm:block">
            <div className="flex items-center gap-1">
              {STUDENT_QUICK_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors duration-200 hover:bg-black/5 ${
                      isActive ? 'bg-black/5' : ''
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-inner transition-transform duration-200 ease-out group-hover:scale-105 ${item.accent}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {item.icon}
                      </svg>
                    </div>
                    <span
                      className={`hidden whitespace-nowrap text-sm lg:inline ${
                        isActive ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    >
                      {item.title}
                    </span>
                  </a>
                );
              })}
            </div>
          </nav>
        ) : (
          <div className="hidden justify-self-center sm:block">
            <span className="inline-flex items-center rounded-full bg-black/5 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors duration-200">
              {title}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-black/5 py-1 pl-1 pr-2 transition-colors duration-200 hover:bg-black/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-semibold text-white shadow-sm">
              {getInitials(userName)}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="max-w-[8rem] truncate text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-[11px] capitalize text-gray-500">{role}</p>
            </div>
            <svg
              aria-hidden
              xmlns="http://www.w3.org/2000/svg"
              className="hidden h-4 w-4 shrink-0 text-gray-400 sm:block"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>

            <div className="flex items-center border-l border-black/10 pl-1.5">
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
