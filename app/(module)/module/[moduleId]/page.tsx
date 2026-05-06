"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWalletKit } from "@/hooks/use-wallet-kit";
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
  credentialId: string | null;
};

type Phase = "intro" | "quiz" | "result";

export default function ModulePage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();
  const groupId = useId();
  const { address } = useWalletKit();

  const [phase, setPhase] = useState<Phase>("intro");
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moduleId = params.moduleId;

  async function handleBegin() {
    if (!address) {
      setError("Connect your wallet to begin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/module/${moduleId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
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
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleLoadModule = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/module/${moduleId}${address ? `?walletAddress=${encodeURIComponent(address)}` : ""}`,
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
  }, [moduleId, address]);

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
    if (!address || !attemptId) return;
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
            walletAddress: address,
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
        passed={result.passed}
        score={result.score}
        credentialId={result.credentialId}
        onRetry={() => {
          setPhase("intro");
          setAnswers({});
          setAttemptId(null);
          setCurrentIdx(0);
          setResult(null);
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

function ResultScreen({
  passed,
  score,
  credentialId,
  onRetry,
  onDashboard,
}: {
  passed: boolean;
  score: number;
  credentialId: string | null;
  onRetry: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-[38%] left-[-18%] h-24 w-[min(90vw,38rem)] -rotate-6 bg-linear-to-r from-[#B273FF] to-[#624781] opacity-[0.28] blur-[120px]" />
      </div>
      <main className="relative mx-auto w-full max-w-[626px] px-4 py-12 text-center md:py-20">
        <div
          className={cn(
            "inline-flex h-16 w-16 items-center justify-center rounded-full text-2xl",
            passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
          )}
        >
          {passed ? "✓" : "✗"}
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-primary md:text-3xl">
          {passed ? "You passed!" : "Not quite"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your score:{" "}
          <span className="font-semibold text-foreground">{score}%</span>
        </p>
        {passed && credentialId && (
          <p className="mt-3 text-sm text-green-600">
            Credential issued to your wallet
          </p>
        )}
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
            {passed ? "View credentials" : "Back to dashboard"}
          </Button>
        </div>
      </main>
    </div>
  );
}
