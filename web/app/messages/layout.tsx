import ProtectedAppLayout from "@/components/community/ProtectedAppLayout";

export default function MessagesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
