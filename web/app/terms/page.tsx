import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

const sections = [
  ["01", "Using Hi!Book", "Hi!Book is a social platform for genuine human connection. Use the service lawfully, respectfully, and in a way that does not harm other people or the platform."],
  ["02", "Your account", "You are responsible for keeping your authentication credentials secure and for the activity performed through your account. You must provide accurate registration information and meet the platform's minimum age requirement."],
  ["03", "Safety and moderation", "Hi!Book may restrict, remove, suspend, or deactivate content and accounts when required to protect users, comply with law, or enforce platform rules. Users can block and report other users or content."],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-black/10 bg-[#fbfaf7] shadow-[0_24px_80px_rgba(23,23,23,0.1)]">
        <header className="border-b border-black/10 bg-[#111827] px-6 py-7 text-white sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xs font-black text-[#111827]">H!</span>Hi!Book</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 transition hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign up</Link>
          </div>
        </header>
        <div className="grid lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-black/10 bg-[#f0eee8] p-6 lg:border-b-0 lg:border-r sm:p-8">
            <FileText className="h-7 w-7 text-blue-600" aria-hidden="true" />
            <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Legal / 01</p>
            <p className="mt-2 text-sm font-bold">Terms of Use</p>
            <p className="mt-4 text-xs leading-5 text-slate-500">The rules that govern participation in the Hi!Book community.</p>
            <div className="mt-8 border-t border-black/10 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Version 1.0 · Initial draft</div>
          </aside>
          <article className="px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Terms of Use</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-[-0.06em] sm:text-6xl">The agreement behind the community.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">These terms describe the basic expectations for using Hi!Book and the controls available when those expectations are not met.</p>
            <div className="mt-12 divide-y divide-black/10 border-y border-black/10">
              {sections.map(([number, title, text]) => <section key={number} className="grid gap-4 py-7 sm:grid-cols-[70px_190px_1fr]"><span className="text-xs font-extrabold text-blue-600">{number}</span><h2 className="text-lg font-extrabold tracking-tight">{title}</h2><p className="text-sm leading-7 text-slate-600">{text}</p></section>)}
            </div>
            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" /><div><h2 className="font-extrabold text-amber-950">Draft status</h2><p className="mt-1 text-sm leading-6 text-amber-900">This is the application's initial legal-document presentation and requires legal review before production publication.</p></div></div></section>
            <nav className="mt-8 flex flex-wrap gap-5 text-sm font-bold" aria-label="Legal documents"><Link href="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link><Link href="/data-protection" className="text-blue-600 hover:text-blue-800">Data Protection</Link><Link href="/community-guidelines" className="text-blue-600 hover:text-blue-800">Community Guidelines</Link></nav>
          </article>
        </div>
      </div>
    </main>
  );
}
