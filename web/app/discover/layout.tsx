import ProtectedAppLayout from "@/components/community/ProtectedAppLayout";

export default function DiscoverLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
