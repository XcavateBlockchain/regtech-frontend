"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { storageKeys } from "@/providers/auth-provider";

const joinSchema = z.object({
  walletAddress: z
    .string()
    .min(32, "Wallet address is required")
    .max(64, "Wallet address is too long"),
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
});

type JoinValues = z.infer<typeof joinSchema>;

type Preview = {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  companyName: string;
};

export default function ModuleJoinPage() {
  const params = useParams<{ shareToken: string }>();
  const router = useRouter();
  const shareToken = params.shareToken;

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm({
    schema: joinSchema,
    defaultValues: {
      walletAddress: "",
      name: "",
      email: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    setError(null);
    fetch(`/api/m/${encodeURIComponent(shareToken)}`)
      .then(async (res) => {
        const json = (await res.json()) as { module?: Preview; error?: string };
        if (!res.ok || !json.module) {
          throw new Error(json.error ?? "Module not found");
        }
        return json.module;
      })
      .then((m) => {
        if (!cancelled) setPreview(m);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load module");
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const description = useMemo(() => {
    const d = preview?.description?.trim() ?? "";
    if (!d) return "";
    return d.length > 220 ? `${d.slice(0, 220)}…` : d;
  }, [preview]);

  async function onSubmit(values: JoinValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/m/${encodeURIComponent(shareToken)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: values.walletAddress,
          name: values.name,
          email: values.email,
        }),
      });
      const json = (await res.json()) as {
        moduleId?: string;
        userId?: string;
        error?: string;
      };
      if (!res.ok || !json.moduleId || !json.userId) {
        throw new Error(json.error ?? "Join failed");
      }

      localStorage.setItem(storageKeys.role, "USER");
      localStorage.setItem(storageKeys.user, json.userId);
      localStorage.removeItem(storageKeys.company);
      localStorage.removeItem(storageKeys.employee);

      router.push(`/module/${json.moduleId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-10 md:py-16">
      <header className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Join training module
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
          {loadingPreview ? "Loading…" : (preview?.name ?? "Module not found")}
        </h1>
        {preview ? (
          <p className="text-sm text-muted-foreground">
            Provided by{" "}
            <span className="font-medium">{preview.companyName}</span>
          </p>
        ) : null}
      </header>

      {preview ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{description}</p>
        </section>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-3">
            <FieldInput
              {...form.register("walletAddress")}
              label="Wallet address"
              placeholder="Your Solana wallet public key"
              error={form.formState.errors.walletAddress}
              required
            />
            <FieldInput
              {...form.register("name")}
              label="Full name"
              placeholder="Your name"
              error={form.formState.errors.name}
              autoComplete="name"
              required
            />
            <FieldInput
              {...form.register("email")}
              label="Email"
              placeholder="you@example.com"
              error={form.formState.errors.email}
              autoComplete="email"
              type="email"
              required
            />
          </div>
          <Button
            type="submit"
            className="mt-4 w-full"
            disabled={
              submitting ||
              loadingPreview ||
              !preview ||
              !form.watch("walletAddress")
            }
          >
            {submitting ? "Joining…" : "Join and continue"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You’ll be enrolled for this module once you continue.
          </p>
        </Form>
      </section>
    </main>
  );
}
