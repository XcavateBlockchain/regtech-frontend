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
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";
import { authSchema } from "@/lib/validations/auth-schema";
import { useWalletContext } from "@/providers/wallet-provider";

export function RegisterForm() {
  const { auth } = useWalletContext();
  const { address, isConnected } = useWalletKit();
  const [step, setStep] = useState(1);

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

  return (
    <ModalContent
      showCloseButton={false}
      className="sm:rounded-[10px] md:max-w-[466px]"
    >
      <div className="flex items-center justify-between gap-4">
        <ModalHeader className="flex-1 text-left">
          <ModalTitle className="text-left">
            {step === 1 ? "Sign up" : "Create account"}
          </ModalTitle>
          <ModalDescription className="text-left">
            {step === 1
              ? "Your profile as the company owner."
              : "Your organization — you can change details later."}
          </ModalDescription>
        </ModalHeader>
        <div className="flex shrink-0 justify-center gap-1.5 max-sm:order-1">
          {Array.from({ length: 2 }, (_, i) => (
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

      <Form form={form} autoComplete="off">
        {step === 1 ? (
          <>
            <div className="flex h-10 items-center justify-between rounded-[10px] bg-primary/10 px-2 text-xs text-primary">
              <span className="truncate">
                Connected wallet: {form.watch("walletAddress")}
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
                onClick={() => auth.setOpen(false)}
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
        ) : (
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
                { label: "Real Estate", value: "real-estate" },
                { label: "Marketplace", value: "marketplace" },
                { label: "Defi", value: "defi" },
                { label: "Other", value: "other" },
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
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button size="lg" type="submit" disabled={!isConnected}>
                Create account
              </Button>
            </div>
          </>
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
