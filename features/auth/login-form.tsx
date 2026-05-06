import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { loginSchema, userSchema } from "@/lib/validations/auth-schema";
import { useAuthContext } from "@/providers/auth-provider";

export function LoginForm() {
  const [page, setPage] = useState<number>(0);
  const { setActivePage } = useAuthContext();

  const pages: Record<number, React.ReactNode> = {
    0: <SigninUser setPage={setPage} />,
    1: <SignupUser setPage={setPage} />,
  };

  return (
    <>
      <div className="flex flex-col items-start gap-2 mb-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setActivePage(0)}
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
          Back
        </button>

        <ModalHeader className="flex items-start flex-col gap-0 md:pb-0">
          <ModalTitle className="text-sm font-semibold">
            {page === 0 ? "Sign In with Email" : "Create Account"}
          </ModalTitle>
          <ModalDescription className="text-center hidden">
            email
          </ModalDescription>
        </ModalHeader>
      </div>

      {pages[page]}
    </>
  );
}

function SignupUser(props: { setPage: (page: number) => void }) {
  const form = useZodForm({
    schema: userSchema,
  });
  return (
    <Form form={form} className="w-full">
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
      <Button type="button">Sign up</Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => props.setPage(0)}
        >
          Signin
        </button>
      </p>
    </Form>
  );
}

function SigninUser(props: { setPage: (page: number) => void }) {
  const form = useZodForm({
    schema: loginSchema,
  });
  return (
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
      <Button type="button">Sign In</Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => props.setPage(1)}
        >
          Signup
        </button>
      </p>
    </Form>
  );
}
