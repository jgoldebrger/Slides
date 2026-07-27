"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { submitAiFeedback } from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type AiFeedbackButtonsProps = {
  deckId?: string;
  slideId?: string;
  featureId?: string;
};

export function AiFeedbackButtons({
  deckId,
  slideId,
  featureId,
}: AiFeedbackButtonsProps) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(rating: -1 | 1) {
    const result = await submitAiFeedback({
      deckId,
      slideId,
      featureId,
      rating,
      correction: correction || undefined,
    });
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      setSubmitted(true);
      toast.success("Thanks for the feedback");
    }
  }

  if (submitted) {
    return <p className="text-xs text-muted-foreground">Feedback recorded</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => void submit(1)}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => {
            setShowCorrection(true);
            void submit(-1);
          }}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Was this helpful?</span>
      </div>
      {showCorrection && (
        <Input
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          placeholder="What was wrong?"
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}
