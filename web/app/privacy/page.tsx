import Link from "next/link";
import { ArrowLeft, Eye, LockKeyhole, ShieldCheck } from "lucide-react";

const sections = [
  ["01", "Information we use", "Hi!Book uses information needed to create and operate your account, provide social features, protect users, and maintain platform security. Private identity and authentication information is not treated as public profile information."],
  ["02", "Your control", "You control important profile visibility and discovery settings. Blocking, reporting, and privacy controls are part of the platform's safety architecture."],
  ["03", "Retention and deletion", "Account deletion follows the platform's deletion and retention workflow. Some safety, moderation, legal, financial, and security records may need to be retained where required."],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-black/10 bg-[#fbfaf7] shadow-[0_24px_80px_rgba(23,23,23,0.1)]">
        <header className="border-b border-black/10 bg-[#111827] px-6 py-7 text-white sm:px-10"><div className="flex flex-wrap items-center justify-between gap-5"><Link href="/" className="inline-flex items-center gap-3 text-sm font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xs font-black text-[#111827]">H!</span>Hi!Book</Link><Link href="/signup" className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign up</Link></div></header>
        <div className="grid lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-black/10 bg-[#f0eee8] p-6 lg:border-b-0 lg:border-r sm:p-8"><Eye className="h-7 w-7 text-violet-600" aria-hidden="true" /><p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Legal / 02</p><p className="mt-2 text-sm font-bold">Privacy Policy</p><p className="mt-4 text-xs leading-5 text-slate-500">How information fits into the Hi!Book experience and the choices around it.</p><div className="mt-8 border-t border-black/10 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Version 1.0 · Initial draft</div></aside>
          <article className="px-6 py-10 sm:px-10 sm:py-14 lg:px-16"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">Privacy Policy</p><h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-[-0.06em] sm:text-6xl">Your information should have boundaries.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">A high-level view of the information Hi!Book uses, the controls you have, and how deletion fits into the platform.</p><div className="mt-12 divide-y divide-black/10 border-y border-black/10">{sections.map(([number,title,text]) => <section key={number} className="grid gap-4 py-7 sm:grid-cols-[70px_190px_1fr]"><span className="text-xs font-extrabold text-violet-600">{number}</span><h2 className="text-lg font-extrabold tracking-tight">{title}</h2><p className="text-sm leading-7 text-slate-600">{text}</p></section>)}</div><section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" /><div><h2 className="font-extrabold text-amber-950">Draft status</h2><p className="mt-1 text-sm leading-6 text-amber-900">This is the application's initial legal-document presentation and requires legal review before production publication.</p></div></div></section><nav className="mt-8 flex flex-wrap gap-5 text-sm font-bold" aria-label="Legal documents"><Link href="/terms" className="text-blue-600 hover:text-blue-800">Terms of Use</Link><Link href="/data-protection" className="text-blue-600 hover:text-blue-800">Data Protection</Link><Link href="/community-guidelines" className="text-blue-600 hover:text-blue-800">Community Guidelines</Link></nav></article>
        </div>
      </div>
    </main>
  );
}
