"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanySlug } from "@/hooks/use-company-slug";

export function Header({ total }: { total: number }) {
  const slug = useCompanySlug();
  const createHref = slug
    ? `/company/${slug}/module/create`
    : "/company/module/create";
  // The Figma shows "12 active modules . 847 total enrolments" —
  // hard-coded enrolment count since the sample data doesn't carry it.
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Modules
        </h1>
        <p className="text-base text-muted-foreground">
          {total} active modules · 847 total enrolments
        </p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={createHref}>Create Module</Link>}
      />
    </div>
  );
}

export function Filters() {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {/* Search input — Figma styles this like a dropdown but the
          intent is clearly a search box (label "Search modules"). */}
      <div className="relative w-full max-w-[260px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <Input
          type="search"
          value={""}
          //   onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search modules"
          className="h-11 pl-10"
        />
      </div>

      <Select
      // value={status}
      // onValueChange={(v) => onStatusChange(v as typeof status)}
      >
        <SelectTrigger className="h-11 w-[150px]">
          <SelectValue placeholder="View all" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">View all</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="draft">Drafts</SelectItem>
        </SelectContent>
      </Select>

      <Select
      // value={category}
      // onValueChange={(v) => onCategoryChange(v as typeof category)}
      >
        <SelectTrigger className="h-11 w-[170px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          <SelectItem value="Securities">Securities</SelectItem>
          <SelectItem value="AML">AML</SelectItem>
          <SelectItem value="KYC">KYC</SelectItem>
          <SelectItem value="DeFi">DeFi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
