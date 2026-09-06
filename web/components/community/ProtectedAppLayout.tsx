import CommunityNav from "@/components/community/CommunityNav";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireActiveUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <CommunityNav />
      {children}
    </div>
  );
}
