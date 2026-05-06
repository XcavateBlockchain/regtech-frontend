import { z } from "zod";

export const CATEGORY_OPTIONS = [
  { value: "securities", label: "Securities" },
  { value: "aml", label: "Anti-Money Laundering" },
  { value: "kyc", label: "KYC" },
  { value: "defi", label: "DeFi" },
  { value: "tax", label: "Tax & Reporting" },
];

export const MODULE_TYPE_OPTIONS = [
  { value: "employee", label: "Employee Training" },
  { value: "user", label: "Customer / User" },
];

export const TIME_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
];

const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50MB
// const ACCEPTED_IMAGE_TYPES = [
//   "image/jpeg",
//   "image/png",
//   "image/webp",
//   "image/jpg",
// ];

const imageFile = z
  .instanceof(File, { message: "An image is required" })
  .refine((f) => f.size <= MAX_IMAGE_BYTES, "Image must be 5MB or smaller");
// .refine(
//   (f) => ACCEPTED_IMAGE_TYPES.includes(f.type),
//   "Image must be JPEG, PNG, or WebP or JPG",
// );

export const moduleSchema = z.object({
  mode: z.enum(["manual", "ai"]),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer"),
  description: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(500, "Description must be 500 characters or fewer"),
  // .optional()
  // .or(z.literal("")),
  category: z.enum(["securities", "aml", "kyc", "defi", "tax"], {
    message: "Please select a category",
  }),
  completionTime: z.enum(["15", "30", "45", "60", "90"], {
    message: "Please select an estimated completion time",
  }),
  language: z.enum(["en", "es", "fr", "de", "zh"], {
    message: "Please select a language",
  }),
  passingScore: z.coerce
    .number({ message: "Passing score must be a number" })
    .int("Passing score must be a whole number")
    .min(1, "Score cannot be negative")
    .max(100, "Score cannot exceed 100"),
  recipients: z.coerce
    .number({ message: "Recipients must be a number" })
    .int("Recipients must be a whole number")
    .min(1, "Add at least one recipient")
    .max(10000, "Maximum is 10,000 recipients"),
  thumbnailImage: imageFile,
  contents: z.array(imageFile),
});

export type ModuleInput = z.input<typeof moduleSchema>;
export type ModuleValues = z.infer<typeof moduleSchema>;

export const moduleWithQuizSchema = moduleSchema.extend({
  moduleType: z.enum(["employee", "user"], { message: "Select a module type" }),
});

export type ModuleWithQuizInput = z.input<typeof moduleWithQuizSchema>;
export type ModuleWithQuizValues = z.infer<typeof moduleWithQuizSchema>;
