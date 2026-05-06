import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { loginSchema } from "@/lib/validations/auth-schema";

export function LoginForm({ setPage }: { setPage: (page: number) => void }) {
  const form = useZodForm({
    schema: loginSchema,
    defaultValues: {
      email: "",
    },
  });
  return (
    <>
      <ModalHeader className="flex-1 text-left">
        <ModalTitle className="text-center">Log in</ModalTitle>
        <ModalDescription className="text-center">
          Use the email associated with your learner or employee account.
        </ModalDescription>
      </ModalHeader>
      <div className="flex flex-col gap-4">
        <Form form={form} autoComplete="off">
          <FieldInput
            {...form.register("email")}
            error={form.formState.errors.email}
            label="Email"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            required
          />
        </Form>
        <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          <span className="text-muted-foreground text-xs">New here?</span>
        </div>
        <Button type="button" variant="outline" onClick={() => setPage(1)}>
          Create learner account
        </Button>
      </div>
    </>
  );
}
