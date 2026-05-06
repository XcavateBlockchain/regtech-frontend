"use client";

import { useMemo, useState } from "react";
import NativeSelect from "@/components/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { inviteCreateSchema } from "@/lib/validations/invite-schema";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { useCompany } from "@/hooks/use-company";

export function AddEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const { address } = useWalletKit();
  const { company } = useCompany(address);
  const [open, setOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm({
    schema: inviteCreateSchema.pick({ email: true, permission: true }),
    defaultValues: { email: "", permission: "REVIEWER" as const },
  });

  const claimUrl = useMemo(() => {
    if (!createdToken) return null;
    if (typeof window === "undefined") return `/invite/${createdToken}`;
    return `${window.location.origin}/invite/${createdToken}`;
  }, [createdToken]);

  async function onSubmit(values: { email: string; permission: string }) {
    if (!company || !address) return;
    setSubmitting(true);
    setError(null);
    setCreatedToken(null);
    try {
      const res = await fetch("/api/company/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          walletAddress: address,
          email: values.email,
          permission: values.permission,
        }),
      });
      const json = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !json.token) {
        throw new Error(json.error ?? "Failed to create invite");
      }
      setCreatedToken(json.token);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add employee
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite employee</DialogTitle>
            <DialogDescription>
              Create a claim link for a new employee to join your company.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-3">
              <FieldInput
                {...form.register("email")}
                label="Employee email"
                placeholder="employee@company.com"
                type="email"
                error={form.formState.errors.email}
                required
              />
              <NativeSelect
                {...form.register("permission")}
                name="permission"
                label="Permission"
                options={[
                  { label: "Reviewer", value: "REVIEWER" },
                  { label: "Issuer", value: "ISSUER" },
                  { label: "Auditor", value: "AUDITOR" },
                ]}
                placeholder="Select permission"
                required
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              <Button type="submit" disabled={!company || !address || submitting}>
                {submitting ? "Creating…" : "Create invite"}
              </Button>
            </div>
          </Form>

          {claimUrl ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Claim link
              </p>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
                {claimUrl}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(claimUrl);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy link
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

