import { AppShell } from "@/components/layout/app-shell";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  return <AppShell initialActiveItem="classes" initialClassId={classId} classViewMode="detail" />;
}
