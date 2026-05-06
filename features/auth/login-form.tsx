import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { loginSchema } from "@/lib/validations/auth-schema";
import { storageKeys, useAuthContext } from "@/providers/auth-provider";

export function LoginForm() {
  const { setActivePage } = useAuthContext();
  return <SigninUser onBack={() => setActivePage(0)} />;
}

function SigninUser(props: { onBack: () => void }) {
  const router = useRouter();
  const { setOpen, setActivePage } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm({
    schema: loginSchema,
  });

  async function onSubmit(values: { email: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as {
        userId?: string;
        role?: "OWNER" | "EMPLOYEE" | "USER";
        companyId?: string | null;
        walletAddress?: string;
        error?: string;
      };
      if (!res.ok || !json.userId || !json.role) {
        throw new Error(json.error ?? "Sign in failed");
      }

      localStorage.setItem(storageKeys.user, json.userId);
      localStorage.setItem(storageKeys.role, json.role);
      if (json.companyId) {
        localStorage.setItem(storageKeys.company, json.companyId);
      } else {
        localStorage.removeItem(storageKeys.company);
      }
      localStorage.removeItem(storageKeys.employee);

      setOpen(false);
      setActivePage(0);

      if (json.role === "OWNER") {
        router.push("/company");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2 mb-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
          onClick={props.onBack}
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
          Back
        </button>

        <ModalHeader className="flex items-start flex-col gap-0 md:pb-0">
          <ModalTitle className="text-sm font-semibold">
            Sign In with Email
          </ModalTitle>
          <ModalDescription className="text-center hidden">
            email
          </ModalDescription>
        </ModalHeader>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Form form={form} autoComplete="off" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldInput
          {...form.register("email")}
          error={form.formState.errors.email}
          label="Email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don’t have an account? Ask your company admin for an invite link, or use
          the module link they shared with you.
        </p>
      </Form>
    </>
  );
}
