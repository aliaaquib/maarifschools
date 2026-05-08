import { AppShell } from "@/components/layout/app-shell";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell
      initialActiveItem="classes"
      classViewMode="overview"
      initialCreateClassOpen={params.create === "1"}
    />
  );
}
