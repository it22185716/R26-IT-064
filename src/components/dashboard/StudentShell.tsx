'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthUser } from '../../hooks/useAuthUser';
import { subscribeAssignedVideos } from '../../lib/assignedVideos';

// Monochrome line icons — the sidebar deliberately carries no per-item color.
// Hierarchy comes from weight and the active state, not hue.
const ICONS: Record<string, ReactNode> = {
  overview: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  ),
  quiz: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  ),
  history: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  meal: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v18M4.5 3v6a3.75 3.75 0 007.5 0V3M19.5 3v18M19.5 3a3 3 0 013 3v3a3 3 0 01-3 3"
    />
  ),
  reading: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  ),
  video: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  ),
};

type NavItem = { href: string; label: string; icon: ReactNode };

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Dashboard',
    items: [{ href: '/dashboard/student', label: 'Overview', icon: ICONS.overview }],
  },
  {
    heading: 'Learning',
    items: [
      { href: '/quiz', label: 'Take Quiz', icon: ICONS.quiz },
      { href: '/dashboard/student/reading', label: 'Reading Practice', icon: ICONS.reading },
      { href: '/dashboard/student/video-recommendation', label: 'Video Library', icon: ICONS.video },
    ],
  },
  {
    heading: 'Wellbeing',
    items: [{ href: '/dashboard/student/meal-plan', label: 'Meal Plan', icon: ICONS.meal }],
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
  userName: string;
  /** Page name shown in the mobile top bar. */
  title: string;
  children: ReactNode;
};

const VIDEO_LIBRARY_HREF = '/dashboard/student/video-recommendation';

export default function StudentShell({ userName, title, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [assignedVideoCount, setAssignedVideoCount] = useState(0);

  // Live listener — a video a teacher assigns while the student's sidebar is
  // already open should surface here without needing a page reload.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeAssignedVideos(user.uid, (videos) => setAssignedVideoCount(videos.length));
    return unsubscribe;
  }, [user]);

  // The drawer is an overlay, so a route change must dismiss it — otherwise it
  // stays open on top of the page the user just navigated to.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth');
  }

  const sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <Link href="/dashboard/student" className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <Image
          src="/logo.png"
          alt="Hayagiri International Buddhist College crest"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full"
        />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-slate-900">Hayagiri</span>
          <span className="truncate text-xs text-slate-500">AI Learning Platform</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150 ${
                        active
                          ? 'bg-gradient-to-r from-indigo-50 to-violet-50 font-semibold text-indigo-700'
                          : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        {item.icon}
                      </svg>
                      <span className="truncate">{item.label}</span>
                      {item.href === VIDEO_LIBRARY_HREF && assignedVideoCount > 0 && (
                        <span
                          title="Your teacher recommended videos for you"
                          className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold text-white"
                        >
                          {assignedVideoCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-xs font-semibold text-white shadow-md shadow-indigo-500/30">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
  );

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[26rem] w-[26rem] rounded-full bg-rose-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl" />
      </div>

      {/* Desktop: permanent rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile: off-canvas drawer */}
      <div className={`lg:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 shadow-xl transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-64">
        {/* Mobile top bar — the only place the menu button lives */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900">{title}</span>
        </header>

        {children}
      </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Sign out?</h3>
            <p className="mt-2 text-sm text-slate-600">You&apos;ll need to sign in again to access your dashboard.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
