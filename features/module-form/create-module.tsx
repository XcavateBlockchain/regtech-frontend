"use client";

import Form, { useZodForm } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { moduleSchema } from "@/lib/validations/module-schema";
import ModuleForm from "./module-form";
import ModuleReviewPane from "./module-review-pane";

export default function CreateModuleFrom() {
  const form = useZodForm({
    schema: moduleSchema,
    mode: "onBlur",
    defaultValues: {
      mode: "manual",
      title: "",
      description: "",
    },
  });
  return (
    <Form
      form={form}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,1fr)] gap-16"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col  gap-0.5">
          <h1 className="text-xl font-semibold leading-none text-foreground">
            Create Module
          </h1>
          <p className="text-base leading-none text-muted-foreground">
            Set title, category, make payment
          </p>
        </div>
        <Tabs value={"manual"} className="w-full gap-6">
          <TabsList className={"bg-transparent gap-2.5"}>
            <TabsTrigger value="manual" className={"w-[173px]"}>
              Manual
            </TabsTrigger>
            <TabsTrigger value="ai" className={"w-[173px]"}>
              Use AI
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="flex flex-col gap-6">
            <ModuleForm form={form} />
          </TabsContent>
        </Tabs>
      </div>

      <div
        className="hidden lg:block lg:w-px lg:bg-border"
        aria-hidden="true"
      />
      <ModuleReviewPane />
    </Form>
  );
}
