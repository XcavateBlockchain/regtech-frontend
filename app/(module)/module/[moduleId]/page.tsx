"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

type Option = { id: string; text: string; sortOrder: number };
type Question = {
  id: string;
  text: string;
  type: string;
  sortOrder: number;
  options: Option[];
};
type ModuleData = {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  passThreshold: number;
  quiz: {
    batchCount: number;
    pointsPerBatch: number;
    sampleBatchLabel: string | null;
  };
};
type Result = {
  passed: boolean;
  score: number;
  scoreBps: number;
  correctCount: number;
  totalCount: number;
  startedAt: string;
  submittedAt: string;
  credential: null | {
    id: string;
    metadataUri: string;
    asset: string | null;
    onChainAddress: string;
    txSignature: string;
  };
};

type Phase = "intro" | "quiz" | "result";

export default function ModulePage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();
  const groupId = useId();
  const { user, openAuthModal } = useUser();

  const [phase, setPhase] = useState<Phase>("intro");
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [quizStartedAtMs, setQuizStartedAtMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moduleId = params.moduleId;

  async function handleBegin() {
    if (!user) {
      openAuthModal();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/module/${moduleId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: user.walletAddress }),
      });
      const json = (await res.json()) as {
        attemptId?: string;
        questions?: Question[];
        error?: string;
      };
      if (!res.ok || !json.attemptId || !json.questions) {
        throw new Error(json.error ?? "Failed to start");
      }
      setAttemptId(json.attemptId);
      setQuestions(json.questions);
      setCurrentIdx(0);
      setQuizStartedAtMs(Date.now());
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleLoadModule = useCallback(async () => {
    try {
      const walletAddress = user?.walletAddress ?? null;
      const res = await fetch(
        `/api/module/${moduleId}${walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : ""}`,
      );
      const json = (await res.json()) as {
        module?: ModuleData;
        error?: string;
      };
      if (!res.ok || !json.module) return;
      setModuleData(json.module);
    } catch {
      // silently ignore — module data used for intro display only
    }
  }, [moduleId, user?.walletAddress]);

  useEffect(() => {
    void handleLoadModule();
  }, [handleLoadModule]);

  function selectOption(questionId: string, optionId: string, multi: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (multi) {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }

  async function handleSubmit() {
    if (!user || !attemptId) return;
    setLoading(true);
    setError(null);
    try {
      const answersPayload = questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: answers[q.id] ?? [],
      }));
      const res = await fetch(
        `/api/module/${moduleId}/attempt/${attemptId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: user.walletAddress,
            answers: answersPayload,
          }),
        },
      );
      const json = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setResult(json);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? [])
    : [];
  const hasAnswer = currentAnswer.length > 0;

  if (phase === "result" && result) {
    return (
      <ResultScreen
        result={result}
        questions={questions}
        answers={answers}
        quizStartedAtMs={quizStartedAtMs}
        moduleId={moduleId}
        onRetry={() => {
          setPhase("intro");
          setAnswers({});
          setAttemptId(null);
          setCurrentIdx(0);
          setResult(null);
          setQuestions([]);
          setQuizStartedAtMs(null);
        }}
        onDashboard={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-[38%] left-[-18%] h-24 w-[min(90vw,38rem)] -rotate-6 bg-linear-to-r from-[#B273FF] to-[#624781] opacity-[0.28] blur-[120px]" />
        <div className="absolute right-[-16%] bottom-[8%] h-24 w-[min(90vw,38rem)] rotate-[5deg] bg-linear-to-r from-[#B273FF] to-[#624781] opacity-[0.24] blur-[120px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[626px] px-4 py-8 md:py-12">
        {phase === "intro" && (
          <>
            <header className="space-y-4">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-primary md:text-[28px] md:leading-8">
                {moduleData?.name ?? "Loading…"}
              </h1>
              <p className="text-pretty text-sm leading-relaxed text-[#545454] md:text-base md:leading-7">
                {moduleData?.description ?? ""}
              </p>
              {moduleData && moduleData.quiz.batchCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {moduleData.quiz.batchCount} quiz variation
                  {moduleData.quiz.batchCount === 1 ? "" : "s"} ·{" "}
                  {moduleData.quiz.pointsPerBatch} points per attempt · pass{" "}
                  {Math.round(moduleData.passThreshold / 100)}%
                </p>
              )}
            </header>

            <section aria-label="Module media" className="mt-8 md:mt-10">
              {moduleData?.thumbnailUrl ? (
                <div className="flex flex-col gap-2">
                  <Image
                    src={moduleData.thumbnailUrl}
                    alt={moduleData.name}
                    width={626}
                    height={308}
                    unoptimized
                    className="w-full overflow-hidden rounded-lg border border-border object-cover"
                  />
                  <a
                    href={moduleData.thumbnailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open thumbnail
                  </a>
                </div>
              ) : (
                <div className="aspect-450/220 w-full overflow-hidden rounded-lg border border-border bg-[#D9D9D9]/80">
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-[#D9D9D9] px-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Video or slide content appears here
                    </p>
                  </div>
                </div>
              )}
            </section>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <div className="mt-8 flex justify-center md:mt-10">
              <Button
                className="h-[42px] min-w-[158px] bg-[#624781] px-6 text-white hover:bg-[#624781]/90"
                disabled={loading}
                onClick={handleBegin}
              >
                {loading ? "Starting…" : "Begin quiz"}
              </Button>
            </div>
          </>
        )}

        {phase === "quiz" && currentQuestion && (
          <>
            <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${((currentIdx + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <section
              aria-labelledby={`${groupId}-heading`}
              className="rounded-[10px] bg-[#624781]/10 px-4 py-5 md:px-6 md:py-6"
            >
              <h2
                className="text-base font-semibold leading-snug text-primary md:text-lg"
                id={`${groupId}-heading`}
              >
                Check your understanding
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#545454] md:text-base md:leading-7">
                {currentQuestion.text}
              </p>

              <ul className="mt-5 flex flex-col gap-2.5">
                {currentQuestion.options.map((opt) => {
                  const inputId = `${groupId}-${opt.id}`;
                  const isMulti = currentQuestion.type === "MULTI_CHOICE";
                  const selected = currentAnswer.includes(opt.id);
                  return (
                    <li key={opt.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-[10px] border bg-background px-3 py-3 transition-colors md:px-4",
                          selected
                            ? "border-primary ring-1 ring-primary/25"
                            : "border-border hover:border-primary/35",
                        )}
                        htmlFor={inputId}
                      >
                        <input
                          checked={selected}
                          className="mt-1 size-4 shrink-0 accent-primary"
                          id={inputId}
                          name={
                            isMulti
                              ? `quiz-${currentQuestion.id}-${opt.id}`
                              : `quiz-${groupId}`
                          }
                          onChange={() =>
                            selectOption(currentQuestion.id, opt.id, isMulti)
                          }
                          type={isMulti ? "checkbox" : "radio"}
                          value={opt.id}
                        />
                        <span className="text-sm leading-relaxed text-[#545454]">
                          {opt.text}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <div className="mt-8 flex justify-center md:mt-10">
              {isLastQuestion ? (
                <Button
                  className="h-[42px] min-w-[158px] bg-[#624781] px-6 text-white hover:bg-[#624781]/90"
                  disabled={!hasAnswer || loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Submitting…" : "Submit"}
                </Button>
              ) : (
                <Button
                  className="h-[42px] min-w-[158px] bg-[#624781] px-6 text-white hover:bg-[#624781]/90"
                  disabled={!hasAnswer}
                  onClick={() => setCurrentIdx((i) => i + 1)}
                >
                  Continue
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ResultScreen({
  result,
  questions,
  answers,
  quizStartedAtMs,
  moduleId,
  onRetry,
  onDashboard,
}: {
  result: Result;
  questions: Question[];
  answers: Record<string, string[]>;
  quizStartedAtMs: number | null;
  moduleId: string;
  onRetry: () => void;
  onDashboard: () => void;
}) {
  const passed = result.passed;
  const elapsedMs =
    quizStartedAtMs != null ? Date.now() - quizStartedAtMs : null;

  const walletAddress =
    result.credential?.asset ?? result.credential?.onChainAddress ?? null;
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const explorerHref = walletAddress
    ? `https://explorer.solana.com/address/${walletAddress}?cluster=${encodeURIComponent(cluster)}`
    : null;

  async function handleShare() {
    const url = `${window.location.origin}/module/${encodeURIComponent(moduleId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
    } catch {
      // ignore — fallback to clipboard
    }
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-[38%] left-[-18%] h-24 w-[min(90vw,38rem)] -rotate-6 bg-linear-to-r from-[#B273FF] to-[#624781] opacity-[0.28] blur-[120px]" />
      </div>
      <main className="relative mx-auto w-full max-w-[626px] px-4 py-10 md:py-16">
        <div className="text-center">
          <Badge variant={passed ? "default" : "destructive"}>
            {passed ? "Passed" : "Failed"}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-primary md:text-4xl">
            {result.score}%
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.correctCount}/{result.totalCount} correct
            {elapsedMs != null ? ` · ${formatDurationMs(elapsedMs)} elapsed` : ""}
          </p>
        </div>

        <section className="mt-8 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Your answers
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review what you selected for each question.
          </p>

          <div className="mt-4 max-h-[420px] overflow-auto pr-2">
            <ol className="space-y-3">
              {questions.map((q, idx) => {
                const selectedIds = new Set(answers[q.id] ?? []);
                const selected = q.options
                  .filter((o) => selectedIds.has(o.id))
                  .map((o) => o.text);

                return (
                  <li key={q.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-foreground">
                      {idx + 1}. {q.text}
                    </p>
                    {selected.length ? (
                      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                        {selected.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No answer selected.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {passed && result.credential ? (
          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  Credential issued
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  mpl-core asset:{" "}
                  <span className="font-mono">
                    {result.credential.asset ?? "pending"}
                  </span>
                </p>
                <div className="mt-2 flex flex-col gap-1 text-xs">
                  <a
                    className="text-primary hover:underline"
                    href={result.credential.metadataUri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open metadata
                  </a>
                  {explorerHref ? (
                    <a
                      className="text-primary hover:underline"
                      href={explorerHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on explorer
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={handleShare}>
                  Share
                </Button>
                <Button
                  type="button"
                  className="bg-[#624781] text-white hover:bg-[#624781]/90"
                  onClick={onDashboard}
                >
                  View credentials
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <div className="mt-8 flex justify-center gap-3">
            {!passed && (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            )}
            <Button
              className="bg-[#624781] text-white hover:bg-[#624781]/90"
              onClick={onDashboard}
            >
              Back to dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
