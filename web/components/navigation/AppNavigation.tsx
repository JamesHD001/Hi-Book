"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/community", label: "Community", icon: "⌂" },
  { href: "/discover", label: "Discover", icon: "◎" },
  { href: "/messages", label: "Messages", icon: "◇" },
  { href: "/notifications", label: "Notifications", icon: "!" },
  { href: "/profile", label: "Profile", icon: "◌" },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/community" className="flex shrink-0 items-center gap-2" aria-label="Hi!Book home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">H!</span>
            <span className="hidden text-lg font-extrabold tracking-tight text-slate-950 sm:block">Hi!Book</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link href="/profile" className="ml-auto grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-white md:ml-2" aria-label="Open your profile">
            H!
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition ${active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
