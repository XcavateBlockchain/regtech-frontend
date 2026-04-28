import SiteHeader from "@/components/layouts/site-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SiteHeader />
      {children}
    </div>
  );
}
