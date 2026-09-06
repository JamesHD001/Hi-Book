import ProtectedAppLayout from "@/components/community/ProtectedAppLayout";

export default function NotificationsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
