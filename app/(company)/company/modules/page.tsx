import { ModuleList } from "@/features/modules/module-list";
import { Filters, Header } from "@/features/modules/module-toolbar";

export default function ModulesPage() {
  return (
    <main className="flex flex-col px-6 py-6 gap-6">
      <Header total={0} />
      <Filters />
      <ModuleList />
    </main>
  );
}
