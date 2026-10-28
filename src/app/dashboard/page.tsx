import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = { title: "Tus ideas — El Pilar" };

// /dashboard?idea=<id> preselects an idea (fixtures: cocina-barrio, hilo-builders).
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ idea?: string }> }) {
  const { idea } = await searchParams;
  return <Dashboard initialId={idea} />;
}
