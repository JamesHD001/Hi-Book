"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Compass, House, MessageCircle, Network, Settings, UserRound } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

const items = [
  { href: "/community", label: "Community", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/network/followers", label: "Network", icon: Network },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
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
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[#eef2ff] text-[#315efb]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              aria-label="Settings"
              className={`grid h-10 w-10 place-items-center rounded-xl transition ${pathname === "/settings" ? "bg-[#eef2ff] text-[#315efb]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
            >
              <Settings size={17} aria-hidden="true" />
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <Link
              href="/profile"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-[#315efb] transition hover:border-[#cdd6ff] hover:bg-white"
              aria-label="Open your profile"
            >
              <UserRound size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/settings"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white md:hidden"
              aria-label="Open settings"
            >
              <Settings size={17} aria-hidden="true" />
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
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl px-1 text-[10px] font-semibold transition ${active ? "bg-[#eef2ff] text-[#315efb]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
                <span className="mt-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
