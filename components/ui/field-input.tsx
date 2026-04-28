import React from "react";
import type {
  FieldErrorsImpl,
  FieldError as FieldErrorsType,
  FieldValues,
  Merge,
} from "react-hook-form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Icon from "@/public/icons";
import { Input } from "./input";
import { Label } from "./label";

type FieldInputError =
  | FieldErrorsType
  | Merge<FieldErrorsType, FieldErrorsImpl<FieldValues>>;

interface FieldInputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: FieldInputError;
  tooltip?: string;
  tooltipDescription?: string;
}

export function FieldInput({
  label,
  className,
  error,
  tooltip,
  tooltipDescription,
  ...props
}: FieldInputProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      {label && (
        <Label htmlFor={props.name || props.id} className="relative gap-1">
          {label}
          {props.required && <span className="text-brand">*</span>}
          {tooltip && (
            <FieldTooltip title={tooltip} description={tooltipDescription} />
          )}
        </Label>
      )}
      <Input className={cn(className)} {...props} />
      {error && <FieldError errors={[error]} />}
    </div>
  );
}

type FieldErrorItem = { message?: string } | FieldInputError | undefined;

const getFieldErrorMessage = (error?: FieldErrorItem) => {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  if ("message" in error) {
    return error.message;
  }
  return undefined;
};

export function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<FieldErrorItem>;
}) {
  const content = React.useMemo(() => {
    if (children) {
      return children;
    }
    if (!errors?.length) {
      return null;
    }
    const normalizedErrors = errors
      .map((error) => {
        const message = getFieldErrorMessage(error);
        return message ? { message } : undefined;
      })
      .filter(Boolean) as Array<{ message: string }>;
    if (!normalizedErrors.length) {
      return null;
    }
    const uniqueErrors = [
      ...new Map(
        normalizedErrors.map((error) => [error.message, error]),
      ).values(),
    ];
    if (uniqueErrors?.length === 1) {
      return uniqueErrors[0]?.message;
    }
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error) =>
            error?.message && <li key={error.message}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);
  if (!content) {
    return null;
  }
  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-destructive text-sm font-normal", className)}
      {...props}
    >
      {content}
    </div>
  );
}

function FieldTooltip({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon.info className="size-3 stroke-primary" strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent className="py-3 bg-[#F8F8F8] text-foreground">
        <div className="space-y-1">
          <p className="font-medium text-[13px]">{title}</p>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
