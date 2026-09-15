"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

const items = [
  { href: "/community", label: "Community", icon: "⌂" },
  { href: "/discover", label: "Discover", icon: "◎" },
  { href: "/network/followers", label: "Network", icon: "◌" },
  { href: "/messages", label: "Messages", icon: "◇" },
  { href: "/notifications", label: "Notifications", icon: "!" },
  { href: "/profile", label: "Profile", icon: "○" },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/community" className="flex shrink-0 items-center gap-2.5" aria-label="Hi!Book home">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[linear-gradient(135deg,#315efb,#8b5cf6)] text-sm font-black text-white shadow-[0_8px_20px_rgba(49,94,251,0.22)] transition hover:-translate-y-0.5">
              H!
            </span>
            <span className="hidden text-lg font-extrabold tracking-[-0.04em] text-slate-950 sm:block">Hi!Book</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[#eef2ff] text-[#315efb]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                >
                  <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <Link
              href="/profile"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-[#315efb] transition hover:border-[#cdd6ff] hover:bg-white"
              aria-label="Open your profile"
            >
              ○
            </Link>
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(16,24,40,0.06)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl px-1 text-[10px] font-semibold transition ${active ? "bg-[#eef2ff] text-[#315efb]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
                <span className="mt-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
