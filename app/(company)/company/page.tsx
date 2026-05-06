import {
  CompanyDashboardHeader,
  CompanyStats,
  ModulesPerformance,
  RecentActivities,
  TeamActivity,
} from "@/features/company";

export default function CompanyPage() {
  return (
    <main className="flex flex-col px-6 py-6 gap-6">
      <CompanyDashboardHeader />
      <CompanyStats />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RecentActivities />
        <TeamActivity />
      </div>
      <ModulesPerformance />
    </main>
  );
}
