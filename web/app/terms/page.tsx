import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileText, ShieldCheck } from "lucide-react";

const sections = [
  ["01", "Using Hi!Book", "Hi!Book is a social platform for genuine human connection. Use the service lawfully, respectfully, and in a way that does not harm other people or the platform."],
  ["02", "Your account", "You are responsible for keeping your authentication credentials secure and for the activity performed through your account. You must provide accurate registration information and meet the platform's minimum age requirement."],
  ["03", "Safety and moderation", "Hi!Book may restrict, remove, suspend, or deactivate content and accounts when required to protect users, comply with law, or enforce platform rules. Users can block and report other users or content."],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#e9e5dc] text-[#171717]">
      <div className="mx-auto min-h-screen max-w-[1500px] overflow-hidden bg-[#f7f3ea] lg:grid lg:grid-cols-[0.34fr_0.66fr]">
        <aside className="relative overflow-hidden bg-[#111827] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-12">
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-3 text-sm font-black"><span className="grid h-11 w-11 rotate-[-6deg] place-items-center rounded-xl bg-[#f6f0e4] text-xs font-black text-[#111827]">H!</span>Hi!Book</Link><span className="font-mono text-[10px] text-white/35">03 / 04</span></div>
            <div className="my-auto py-16"><FileText className="h-8 w-8 text-[#ff9a7f]" aria-hidden="true" /><p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff9a7f]">Legal / terms</p><h1 className="mt-5 text-5xl font-black leading-[0.9] tracking-[-0.07em] xl:text-7xl">The rules<br />of the room.</h1><p className="mt-7 max-w-sm text-sm leading-6 text-white/45">The agreement behind participation in the Hi!Book community.</p></div>
            <Link href="/signup" className="inline-flex items-center gap-2 text-xs font-bold text-white/50 transition hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign up</Link>
          </div>
        </aside>
        <article className="px-6 py-10 sm:px-10 sm:py-14 lg:px-16 xl:px-24">
          <header className="flex items-center justify-between border-b border-black/10 pb-6"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c94d35]">Terms of Use</p><p className="mt-2 text-xs text-black/40">Version 1.0 · Initial draft</p></div><ShieldCheck className="h-5 w-5 text-black/20" aria-hidden="true" /></header>
          <div className="py-12"><p className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">Hi!Book works better when everyone understands the boundaries.</p><div className="mt-12 divide-y divide-black/10 border-y border-black/10">{sections.map(([number,title,text]) => <section key={number} className="grid gap-5 py-8 sm:grid-cols-[54px_0.8fr_1.4fr]"><span className="font-mono text-xs font-bold text-[#c94d35]">{number}</span><h2 className="text-lg font-black tracking-tight">{title}</h2><p className="text-sm leading-7 text-black/55">{text}</p></section>)}</div><div className="mt-8 border-l-2 border-[#ff9a7f] bg-[#eee9df] p-5"><p className="text-xs font-black uppercase tracking-[0.15em]">Draft status</p><p className="mt-2 text-sm leading-6 text-black/55">This is the application's initial legal-document presentation and requires legal review before production publication.</p></div></div>
          <nav className="flex flex-wrap gap-x-7 gap-y-3 border-t border-black/10 pt-6 text-xs font-bold" aria-label="Legal documents"><Link href="/privacy" className="hover:text-[#c94d35]">Privacy</Link><Link href="/data-protection" className="hover:text-[#c94d35]">Data Protection</Link><Link href="/community-guidelines" className="hover:text-[#c94d35]">Community Guidelines</Link><Link href="/" className="ml-auto inline-flex items-center gap-1 text-black/40 hover:text-black">Home <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></nav>
        </article>
      </div>
    </main>
  );
}
