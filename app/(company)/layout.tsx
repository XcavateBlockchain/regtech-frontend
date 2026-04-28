import CompanyNavHeader from "@/components/layouts/company-nav-header";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-screen flex-col">
      <CompanyNavHeader />
      {children}
    </div>
  );
}
