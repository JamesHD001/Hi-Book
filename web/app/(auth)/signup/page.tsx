import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(59,130,246,0.38),transparent_30%),radial-gradient(circle_at_85%_72%,rgba(139,92,246,0.28),transparent_34%),linear-gradient(145deg,#020617,#0f172a)]" />
          <div className="absolute -right-24 top-1/3 h-64 w-64 rounded-full border border-white/10 bg-white/[0.03]" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full border border-blue-400/10 bg-blue-400/[0.03]" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">H!</span>
              Hi!Book
            </Link>

            <div className="mt-20 max-w-lg">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                Your identity. Your community.
              </div>
              <h2 className="text-4xl font-bold leading-[1.08] tracking-tight xl:text-6xl">
                Build a space that feels like yours.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                Create your Hi!Book identity, decide what you share, and connect with people beyond distance.
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ["01", "Create", "Set up your identity."],
              ["02", "Discover", "Find people and interests."],
              ["03", "Connect", "Share and stay in touch."],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <p className="text-xs font-bold tracking-[0.16em] text-blue-300">{number}</p>
                <p className="mt-2 font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center bg-white px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-2xl">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">H!</span>
                Hi!Book
              </Link>
            </div>

            <div className="mt-7 lg:mt-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Create your account</p>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Welcome to Hi!Book.</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">A few details are all it takes to create your identity and join the community.</p>
                </div>
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 sm:inline-flex">Free to join</span>
              </div>
            </div>

            <SignupForm />
          </div>
        </section>
      </div>
    </main>
  );
}
