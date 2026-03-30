"use client";

import { Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface LessonPlannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function LessonPlannerModal({ open, onClose }: LessonPlannerModalProps) {
  const [prompt, setPrompt] = useState("");
  const [lessonPlan, setLessonPlan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setLessonPlan("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Describe the lesson you want to create.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: trimmedPrompt }),
      });

      const payload = (await response.json()) as { lessonPlan?: string; error?: string };
      if (!response.ok || !payload.lessonPlan) {
        throw new Error(payload.error ?? "We could not generate the lesson plan.");
      }

      setLessonPlan(payload.lessonPlan);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not generate the lesson plan.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-scale-in w-full max-w-3xl rounded-[28px] border border-border bg-background p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-normal text-muted-foreground">Lesson Planning</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Create a Cambridge-style lesson plan</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Tell the assistant the topic, grade, learning goals, or lesson context, and it will turn that into a structured classroom-ready plan.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Create a Cambridge Grade 6 science lesson on states of matter with success criteria and assessment."
          />

          {error ? <p className="text-sm text-foreground/80">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" loading={loading} loadingText="Generating...">
              <Sparkles className="h-4 w-4" />
              Generate lesson plan
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4">
          <p className="text-sm font-medium text-foreground">Generated plan</p>
          {lessonPlan ? (
            <Textarea value={lessonPlan} readOnly className="mt-3 min-h-[360px] resize-none bg-background" />
          ) : (
            <div className="mt-3 flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/80 p-6 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                Describe the lesson you need, then generate a plan with objectives, success criteria, teaching sequence, differentiation, and assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
