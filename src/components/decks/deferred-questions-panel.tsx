"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DeferredQuestion = {
  id: string;
  question: string;
  viewer_email: string | null;
  status: "pending" | "answered" | "dismissed";
  owner_answer: string | null;
  answered_at: string | null;
  created_at: string;
};

type ErrorResponse = {
  error?: {
    message?: string;
  };
};

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as ErrorResponse | null;
  return body?.error?.message ?? fallback;
}

export function DeferredQuestionsPanel({
  deckId,
  initialQuestions,
}: {
  deckId: string;
  initialQuestions: DeferredQuestion[];
}) {
  const [questions, setQuestions] =
    useState<DeferredQuestion[]>(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateQuestion(
    questionId: string,
    status: "answered" | "dismissed"
  ) {
    const answer = answers[questionId]?.trim() ?? "";
    if (status === "answered" && !answer) {
      toast.error("Enter an answer before marking this question answered");
      return;
    }

    setSavingId(questionId);
    try {
      const response = await fetch(
        `/api/decks/${deckId}/deferred-questions/${questionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            owner_answer: status === "answered" ? answer : null,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not update question"));
      }

      setQuestions((current) =>
        current.filter((question) => question.id !== questionId)
      );
      setAnswers((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      toast.success(status === "answered" ? "Question answered" : "Question dismissed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update question"
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      aria-labelledby="deferred-questions-heading"
    >
      <div>
        <h2 id="deferred-questions-heading" className="font-medium">
          Viewer questions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Questions the AI could not answer from this deck.
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No unanswered viewer questions.
        </p>
      ) : (
        <ul className="space-y-4">
          {questions.map((question) => {
            const saving = savingId === question.id;
            const answerId = `deferred-answer-${question.id}`;
            return (
              <li
                key={question.id}
                className="space-y-3 rounded-md border border-border bg-background p-3"
              >
                <div>
                  <p className="text-sm font-medium">{question.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(question.created_at).toLocaleString()}
                    {question.viewer_email
                      ? ` · Reply requested by ${question.viewer_email}`
                      : ""}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={answerId}>Your answer</Label>
                  <Textarea
                    id={answerId}
                    value={answers[question.id] ?? ""}
                    maxLength={5000}
                    disabled={saving}
                    placeholder="Write an answer for your team’s follow-up…"
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={saving || !(answers[question.id]?.trim())}
                    onClick={() => void updateQuestion(question.id, "answered")}
                  >
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Mark answered
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void updateQuestion(question.id, "dismissed")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
