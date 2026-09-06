import ProtectedAppLayout from "@/components/community/ProtectedAppLayout";

export default function CommunityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
