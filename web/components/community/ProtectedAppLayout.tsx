import AppNavigation from "@/components/navigation/AppNavigation";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireActiveUser();

  return (
    <div className="hb-app-shell">
      <AppNavigation />
      <div className="pb-20 md:pb-0">{children}</div>
    </div>
  );
}
