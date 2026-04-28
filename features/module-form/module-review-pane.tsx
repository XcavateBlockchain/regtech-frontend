import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { ModuleInput } from "@/lib/validations/module-schema";
import { CATEGORY_OPTIONS } from "@/lib/validations/module-schema";

export default function ModuleReviewPane() {
  const values = useWatch<ModuleInput>();
  const { formState } = useFormContext<ModuleInput>();

  const titleDisplay = values.title?.trim() || "—";
  const categoryDisplay =
    CATEGORY_OPTIONS.find((c) => c.value === values.category)?.label ?? "—";
  const passingScoreDisplay =
    typeof values.passingScore === "number" &&
    !Number.isNaN(values.passingScore)
      ? `${values.passingScore}%`
      : "—";

  return (
    <aside className="flex w-full max-w-[420px] flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <div className="flex w-[280px] flex-col">
          <h2 className="text-base font-semibold leading-6 text-ink-strong">
            Review &amp; Publish
          </h2>
          <p className="text-xs font-light leading-6 text-ink-mute">
            Everything looks good? Publish to make it live
          </p>
        </div>

        <div className="flex w-full flex-col gap-6 rounded-lg border border-foreground/90 px-3.5 py-4 text-xs text-ink-subtle">
          <div className="flex flex-col gap-5">
            <ReviewRow label="Title" value={titleDisplay} />
            <ReviewRow label="Category" value={categoryDisplay} />
            <ReviewRow
              label="Completion Time"
              value={values.completionTime ?? "—"}
            />
            <ReviewRow label="Language" value={values.language ?? "—"} />
            <ReviewRow label="Passing Score" value={passingScoreDisplay} />
            <ReviewRow
              label="Recipients"
              value={values.recipients?.toString() ?? "—"}
            />
          </div>
          <div className="flex items-center justify-between font-display font-semibold">
            <span>Payment</span>
            <span>$300</span>
          </div>
        </div>

        <div className="rounded-lg border border-foreground/90 bg-foreground/4 px-2.5 py-1.5">
          <p className="text-xs font-light leading-6 text-foreground">
            Publishing will make this module visible to all investors on
            regtech. A small platform fee (5%) applies to each enrolment.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="flex-1">
          Save
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={formState.isSubmitting}
        >
          Publish
        </Button>
      </div>
    </aside>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-display font-light">{label}</span>
      <span className="truncate text-right font-display">{value}</span>
    </div>
  );
}
