import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { userSchema } from "@/lib/validations/auth-schema";

export function SignupForm({ setPage }: { setPage: (page: number) => void }) {
  const form = useZodForm({
    schema: userSchema,
    defaultValues: {
      walletAddress: "",
      name: "",
      email: "",
      role: "USER",
    },
  });
  return (
    <>
      <ModalHeader className="flex-1 text-left">
        <ModalTitle className="text-center">Sign up</ModalTitle>
        <ModalDescription className="text-center">
          We just need a few details to get you started.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-4">
        <Form form={form} autoComplete="off">
          <FieldInput
            {...form.register("walletAddress")}
            error={form.formState.errors.walletAddress}
            label="Wallet Address"
            placeholder="0x1234567890"
            type="text"
            autoComplete="off"
            required
          />
          <FieldInput
            {...form.register("name")}
            error={form.formState.errors.name}
            label="Name"
            placeholder="Your name"
            type="text"
            autoComplete="off"
            required
          />
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
          <span className="text-muted-foreground text-xs">
            Already have an account?
          </span>
        </div>
        <Button type="button" variant="outline" onClick={() => setPage(0)}>
          Login
        </Button>
      </div>
    </>
  );
}
