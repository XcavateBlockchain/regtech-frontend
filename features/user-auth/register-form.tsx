"use client";

import type { Address } from "@solana/kit";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/modal";
import NativeSelect from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAndDelegateSwig } from "@/hooks/use-swig";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn, formatAddress } from "@/lib/utils";
import { type AuthValues, authSchema } from "@/lib/validations/auth-schema";
import { useWalletContext } from "@/providers/wallet-provider";

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Sign up",
  2: "Create account",
  3: "Setting up wallet…",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  1: "Your profile as the company owner.",
  2: "Your organization — you can change details later.",
  3: "Two signatures needed from your wallet.",
};

export function RegisterForm() {
  const { setCompanyModal } = useWalletContext();
  const { address, isConnected } = useWalletKit();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const { execute: createAndDelegateSwig, loading: swigLoading } =
    useCreateAndDelegateSwig();

  const form = useZodForm({
    schema: authSchema,
    defaultValues: {
      walletAddress: address ?? "",
      name: "",
      email: "",
      role: "OWNER" as const,
      companyName: "",
      companySlug: "",
      description: "",
    },
  });

  const isLoading = swigLoading || step === 3;

  async function handleSubmit(values: AuthValues) {
    if (!address || !isConnected) return;
    setError(null);
    setStep(3);

    try {
      // Tx1 + Tx2: create Swig, add server delegate (2 Phantom signatures)
      const { swigAddress, swigId } = await createAndDelegateSwig(
        address as Address,
      );

      // Create user + company in DB
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          name: values.name,
          email: values.email,
          companyName: values.companyName,
          companySlug: values.companySlug,
          industry: values.industry,
          description: values.description ?? "",
          swigAddress,
          swigId,
        }),
      });

      if (!registerRes.ok) {
        const body = (await registerRes.json()) as { error: string };
        throw new Error(body.error ?? "Registration failed");
      }

      const { companyId } = (await registerRes.json()) as {
        userId: string;
        companyId: string;
      };

      // Register partner on-chain (server-signed with admin keypair)
      const partnerRes = await fetch("/api/company/register-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, walletAddress: address }),
      });

      if (!partnerRes.ok) {
        const body = (await partnerRes.json()) as { error: string };
        throw new Error(body.error ?? "On-chain registration failed");
      }

      setCompanyModal(false);
      router.push("/company");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
      setStep(2);
    }
  }

  const totalSteps = 2; // visible steps (step 3 is a loading overlay)

  return (
    <ModalContent
      showCloseButton={false}
      className="sm:rounded-[10px] md:max-w-[466px]"
    >
      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <ModalHeader className="flex-1 text-left">
          <ModalTitle className="text-left">{STEP_LABELS[step]}</ModalTitle>
          <ModalDescription className="text-left">
            {STEP_DESCRIPTIONS[step]}
          </ModalDescription>
        </ModalHeader>
        <div className="flex shrink-0 justify-center gap-1.5 max-sm:order-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              className={cn(
                "h-1 w-8 rounded-[4px] transition-colors",
                step > i ? "bg-primary" : "bg-primary/20",
              )}
              key={String(i)}
            />
          ))}
        </div>
      </div>

      <Form
        form={form}
        autoComplete="off"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        {step === 1 ? (
          <>
            <div className="flex h-10 items-center justify-between rounded-[10px] bg-primary/10 px-2 text-xs text-primary">
              <span className="truncate">
                Connected wallet: {formatAddress(form.watch("walletAddress"))}
              </span>
            </div>
            <FieldInput
              {...form.register("name")}
              error={form.formState.errors.name}
              label="Full name"
              placeholder="Your name"
            />
            <FieldInput
              {...form.register("email")}
              error={form.formState.errors.email}
              label="Email"
              placeholder="you@company.com"
              type="email"
              autoComplete="email"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="lg"
                type="button"
                variant="outline"
                onClick={() => setCompanyModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                type="button"
                disabled={!isConnected || !address}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </>
        ) : step === 2 ? (
          <>
            <FieldInput
              {...form.register("companyName")}
              error={form.formState.errors.companyName}
              label="Company name"
              placeholder="Acme Compliance"
            />
            <FieldInput
              {...form.register("companySlug")}
              error={form.formState.errors.companySlug}
              label="Company URL"
              placeholder=""
              addOn={
                <span className="text-muted-foreground text-sm">
                  regtech.com
                </span>
              }
            />
            <NativeSelect
              {...form.register("industry")}
              name="industry"
              label="Industry"
              options={[
                { label: "Real Estate", value: "Real Estate" },
                { label: "Marketplace", value: "Marketplace" },
                { label: "Defi", value: "Defi" },
                { label: "Other", value: "Other" },
              ]}
              placeholder="Select Industry"
              required
            />
            <div className="flex w-full flex-col gap-1">
              <Label htmlFor="signup-description">Description (optional)</Label>
              <Textarea
                id="signup-description"
                rows={3}
                aria-invalid={!!form.formState.errors.description}
                placeholder="Briefly describe your company"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="lg"
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                size="lg"
                type="submit"
                disabled={!isConnected || isLoading}
              >
                {isLoading ? "Creating…" : "Create account"}
              </Button>
            </div>
          </>
        ) : (
          // Step 3: loading overlay
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">
              Please sign both prompts in your wallet to set up your company
              wallet.
            </p>
          </div>
        )}
      </Form>

      <p className="text-center text-muted-foreground text-xs">
        By signing up you agree to our{" "}
        <a className="underline hover:no-underline" href="/#">
          Terms
        </a>
        .
      </p>
    </ModalContent>
  );
}
