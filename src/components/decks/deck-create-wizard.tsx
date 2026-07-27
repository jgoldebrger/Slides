"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { captureEvent } from "@/components/analytics/posthog-provider";
import { getActionError } from "@/lib/action-result";
import {
  approveOutline,
  enqueueOutlineGeneration,
  getOutlineJobStatus,
} from "@/lib/actions/decks";
import {
  createDeck,
  createProject,
  saveProjectUpdate,
} from "@/lib/actions/projects";
import {
  DECK_TYPES,
  DECK_TYPE_LABELS,
  WIZARD_STEPS,
  defaultDeckName,
  parseQuickUpdate,
  type WizardStep,
} from "@/lib/decks/create-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

type Project = { id: string; name: string };

type BuildPhase =
  | "idle"
  | "project"
  | "update"
  | "deck"
  | "outline"
  | "slides"
  | "done"
  | "error";

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <ol className="flex items-center gap-2">
      {WIZARD_STEPS.map((step, i) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                done && "bg-primary text-primary-foreground",
                active && !done && "border-2 border-primary text-primary",
                !done && !active && "border border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                active ? "font-medium" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function DeckCreateWizard({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("project");

  const [step, setStep] = useState<WizardStep>(1);
  const [projectMode, setProjectMode] = useState<"existing" | "new">(
    projects.length ? "existing" : "new"
  );
  const [projectId, setProjectId] = useState(() => {
    if (preselected && projects.some((p) => p.id === preselected)) {
      return preselected;
    }
    return projects.length === 1 ? projects[0]!.id : "";
  });
  const [newProjectName, setNewProjectName] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [deckName, setDeckName] = useState("");
  const [deckType, setDeckType] = useState<string>("project_status");
  const [buildPhase, setBuildPhase] = useState<BuildPhase>("idle");
  const [buildError, setBuildError] = useState<string | null>(null);

  const selectedProjectName = useMemo(() => {
    if (projectMode === "new") return newProjectName.trim();
    return projects.find((p) => p.id === projectId)?.name ?? "";
  }, [projectMode, newProjectName, projectId, projects]);

  useEffect(() => {
    if (step === 3 && selectedProjectName && !deckName) {
      setDeckName(defaultDeckName(selectedProjectName));
    }
  }, [step, selectedProjectName, deckName]);

  function canAdvance(): boolean {
    if (step === 1) {
      return projectMode === "new"
        ? newProjectName.trim().length > 0
        : Boolean(projectId);
    }
    if (step === 2) return updateText.trim().length >= 20;
    if (step === 3) return deckName.trim().length > 0;
    return false;
  }

  async function runBuild() {
    setStep(4);
    setBuildError(null);

    try {
      let resolvedProjectId = projectId;

      if (projectMode === "new") {
        setBuildPhase("project");
        const fd = new FormData();
        fd.set("name", newProjectName.trim());
        fd.set("status", "active");
        const projectResult = await createProject(fd);
        if ("error" in projectResult && projectResult.error) {
          const err = projectResult.error as Record<string, string[] | undefined>;
          throw new Error(err._form?.[0] ?? err.name?.[0] ?? "Could not create project");
        }
        resolvedProjectId = projectResult.data?.id ?? "";
        if (!resolvedProjectId) throw new Error("Could not create project");
      }

      setBuildPhase("update");
      const parsed = parseQuickUpdate(updateText);
      const updateResult = await saveProjectUpdate(resolvedProjectId, {
        progress: parsed.progress || updateText.trim(),
        completed_work: parsed.completed_work,
        next_steps: parsed.next_steps,
        goals: [],
        current_tasks: [],
        milestones: [],
        metrics: [],
        risks: [],
        blockers: [],
        screenshots: [],
      });
      const updateErr = getActionError(updateResult);
      if (updateErr) throw new Error(updateErr);

      setBuildPhase("deck");
      const deckFd = new FormData();
      deckFd.set("project_id", resolvedProjectId);
      deckFd.set("name", deckName.trim());
      deckFd.set("type", deckType);
      const deckResult = await createDeck(deckFd);
      if ("error" in deckResult && deckResult.error) {
        const err = deckResult.error as Record<string, string[] | undefined>;
        throw new Error(err._form?.[0] ?? err.name?.[0] ?? "Could not create deck");
      }
      const deckId = deckResult.data?.id;
      if (!deckId) throw new Error("Could not create deck");

      captureEvent("deck_created", { deck_id: deckId, wizard: true });

      setBuildPhase("outline");
      const outlineResult = await enqueueOutlineGeneration(deckId);
      const outlineErr = getActionError(outlineResult);
      if (outlineErr) throw new Error(outlineErr);

      let outlineReady = false;
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const status = await getOutlineJobStatus(deckId);
        if (status.generationStatus === "completed" && status.outline) {
          outlineReady = true;
          break;
        }
        if (status.generationStatus === "failed") {
          throw new Error(status.error ?? "Outline generation failed");
        }
      }
      if (!outlineReady) throw new Error("Outline generation timed out");

      setBuildPhase("slides");
      const approveResult = await approveOutline(deckId);
      const approveErr = getActionError(approveResult);
      if (approveErr) throw new Error(approveErr);

      setBuildPhase("done");
      toast.success("Your deck is building!");
      router.push(`/decks/${deckId}/editor`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setBuildError(msg);
      setBuildPhase("error");
      toast.error(msg);
    }
  }

  const phaseLabel: Record<BuildPhase, string> = {
    idle: "",
    project: "Creating project…",
    update: "Saving your update…",
    deck: "Creating deck…",
    outline: "Generating slide outline…",
    slides: "Building slides…",
    done: "Opening editor…",
    error: buildError ?? "Failed",
  };

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Step 1 — Choose a project</CardTitle>
            <CardDescription>
              Pick an existing project or create a new one for this deck.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={projectMode === "existing" ? "default" : "outline"}
                size="sm"
                disabled={!projects.length}
                onClick={() => setProjectMode("existing")}
              >
                Existing project
              </Button>
              <Button
                type="button"
                variant={projectMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setProjectMode("new")}
              >
                New project
              </Button>
            </div>

            {projectMode === "existing" ? (
              <div className="space-y-2">
                <Label htmlFor="project_id">Project</Label>
                <select
                  id="project_id"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select project…
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="new_project_name">Project name</Label>
                <Input
                  id="new_project_name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Q1 Platform Migration"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Step 2 — What&apos;s the update?</CardTitle>
            <CardDescription>
              Paste notes, bullets, or a quick status. AI will turn this into slides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              rows={10}
              placeholder={`Example:\n\nShipped the new dashboard to beta. NPS improved to 42.\n\n- Completed API migration\n- Fixed top 3 customer bugs\n\nNext: roll out to all teams by Friday.`}
            />
            <p className="text-xs text-muted-foreground">
              Tip: use &quot;Done:&quot; and &quot;Next:&quot; lines to separate completed work and next steps.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Step 3 — Name your deck</CardTitle>
            <CardDescription>
              Choose a name and presentation style.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck_name">Deck name</Label>
              <Input
                id="deck_name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="March status update"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deck_type">Presentation type</Label>
              <select
                id="deck_type"
                value={deckType}
                onChange={(e) => setDeckType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                {DECK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DECK_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Step 4 — Building your deck</CardTitle>
            <CardDescription>
              Sit tight — we&apos;re creating your outline and slides.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            {buildPhase !== "error" ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">{phaseLabel[buildPhase]}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(["project", "update", "deck", "outline", "slides"] as const).map(
                    (phase) => (
                      <li
                        key={phase}
                        className={cn(
                          buildPhase === phase && "font-medium text-foreground"
                        )}
                      >
                        {phase === "project" && "Create project"}
                        {phase === "update" && "Save update"}
                        {phase === "deck" && "Create deck"}
                        {phase === "outline" && "Generate outline"}
                        {phase === "slides" && "Build slides"}
                      </li>
                    )
                  )}
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm text-destructive">{buildError}</p>
                <Button onClick={() => void runBuild()}>Try again</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step < 4 && (
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canAdvance()}
              onClick={() => void runBuild()}
            >
              Build my deck
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
