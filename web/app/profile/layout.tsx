import ProtectedAppLayout from "@/components/community/ProtectedAppLayout";

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
