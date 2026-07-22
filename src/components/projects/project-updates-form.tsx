"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { saveProjectUpdate, uploadScreenshot } from "@/lib/actions/projects";
import {
  generateUpdateDiffNarrative,
  parseMeetingNotesToUpdate,
  saveProjectUpdateWithSnapshot,
} from "@/lib/actions/project-ai";
import {
  AUTOSAVE_DEBOUNCE_MS,
  useDebouncedEffect,
} from "@/lib/hooks/use-debounce";
import type { ProjectUpdateInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiIntakePanel } from "@/components/projects/ai-intake-panel";
import { AiAddonsHub } from "@/components/decks/ai-addons-hub";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ESSENTIAL_TABS = [
  { id: "goals", label: "Goals" },
  { id: "progress", label: "Progress" },
  { id: "metrics", label: "Metrics" },
  { id: "risks", label: "Risks" },
] as const;

const MORE_TABS = [
  { id: "tasks", label: "Tasks" },
  { id: "milestones", label: "Milestones" },
  { id: "blockers", label: "Blockers" },
  { id: "next_steps", label: "Next steps" },
  { id: "screenshots", label: "Screenshots" },
] as const;

type TabId =
  | (typeof ESSENTIAL_TABS)[number]["id"]
  | (typeof MORE_TABS)[number]["id"];

type ProjectUpdatesFormProps = {
  projectId: string;
  initialData: ProjectUpdateInput;
};

export function ProjectUpdatesForm({
  projectId,
  initialData,
}: ProjectUpdatesFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("goals");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<ProjectUpdateInput>(initialData);
  const [lastSaved, setLastSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState("");
  const [importingNotes, setImportingNotes] = useState(false);
  const [updateNarrative, setUpdateNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const persistUpdates = useCallback(async () => {
    setSaving(true);
    const result = await saveProjectUpdate(projectId, data);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Save failed");
    } else {
      setLastSaved(true);
      setDirty(false);
    }
    setSaving(false);
  }, [projectId, data]);

  useDebouncedEffect(
    () => {
      setDirty(true);
      setLastSaved(false);
      void persistUpdates();
    },
    [data],
    AUTOSAVE_DEBOUNCE_MS,
    { skipFirst: true }
  );

  async function handleSave() {
    await persistUpdates();
    toast.success("Updates saved");
  }

  async function handleScreenshotUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    const result = await uploadScreenshot(projectId, formData);
    const actionError = getActionError(result); if (actionError) { toast.error(actionError);
    } else {
      toast.success("Screenshot uploaded");
      const path = "path" in result ? (result.path as string) : "";
      if (!path) return;
      const caption = formData.get("caption")?.toString();
      setData((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, { path, caption }],
      }));
      (e.target as HTMLFormElement).reset();
    }
    setUploading(false);
  }

  function updateListItem(
    field: keyof Pick<
      ProjectUpdateInput,
      "goals" | "completed_work" | "blockers" | "next_steps"
    >,
    index: number,
    value: string
  ) {
    setData((prev) => {
      const list = [...prev[field]];
      list[index] = value;
      return { ...prev, [field]: list };
    });
  }

  function addListItem(
    field: keyof Pick<
      ProjectUpdateInput,
      "goals" | "completed_work" | "blockers" | "next_steps"
    >
  ) {
    setData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  }

  function removeListItem(
    field: keyof Pick<
      ProjectUpdateInput,
      "goals" | "completed_work" | "blockers" | "next_steps"
    >,
    index: number
  ) {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }

  function mergeAiUpdates(updates: Partial<ProjectUpdateInput>) {
    setData((prev) => ({
      ...prev,
      goals: updates.goals?.length ? updates.goals : prev.goals,
      progress: updates.progress || prev.progress,
      completed_work: updates.completed_work?.length
        ? updates.completed_work
        : prev.completed_work,
      current_tasks: updates.current_tasks?.length
        ? updates.current_tasks
        : prev.current_tasks,
      milestones: updates.milestones?.length ? updates.milestones : prev.milestones,
      metrics: updates.metrics?.length ? updates.metrics : prev.metrics,
      risks: updates.risks?.length ? updates.risks : prev.risks,
      blockers: updates.blockers?.length ? updates.blockers : prev.blockers,
      next_steps: updates.next_steps?.length ? updates.next_steps : prev.next_steps,
    }));
    setDirty(true);
  }

  async function handleImportMeetingNotes() {
    setImportingNotes(true);
    const result = await parseMeetingNotesToUpdate(projectId, meetingNotes);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else if ("data" in result && result.data) {
      setData((prev) => ({
        ...prev,
        goals: result.data.goals.length ? result.data.goals : prev.goals,
        progress: result.data.progress || prev.progress,
        completed_work: result.data.completed_work.length ? result.data.completed_work : prev.completed_work,
        current_tasks: result.data.current_tasks.length ? result.data.current_tasks : prev.current_tasks,
        milestones: result.data.milestones.length ? result.data.milestones : prev.milestones,
        metrics: result.data.metrics.length ? result.data.metrics : prev.metrics,
        risks: result.data.risks.length ? result.data.risks : prev.risks,
        blockers: result.data.blockers.length ? result.data.blockers : prev.blockers,
        next_steps: result.data.next_steps.length ? result.data.next_steps : prev.next_steps,
      }));
      toast.success("Meeting notes imported — review and save");
      setDirty(true);
    }
    setImportingNotes(false);
  }

  async function handleUpdateNarrative() {
    setNarrativeLoading(true);
    const result = await generateUpdateDiffNarrative(projectId);
    const actionError = getActionError(result);
    if (actionError) toast.error(actionError);
    else if ("narrative" in result) {
      setUpdateNarrative(`${result.narrative}\n\n${result.highlights?.map((h) => `• ${h}`).join("\n") ?? ""}`);
      toast.success("Change narrative ready");
    }
    setNarrativeLoading(false);
  }

  async function handleSaveWithSnapshot() {
    setSaving(true);
    const result = await saveProjectUpdateWithSnapshot(projectId, data);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Save failed");
    } else {
      setLastSaved(true);
      setDirty(false);
      toast.success("Saved with snapshot for diff narrative");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        <Label htmlFor="meeting-notes">Import from meeting notes</Label>
        <textarea
          id="meeting-notes"
          rows={4}
          value={meetingNotes}
          onChange={(e) => setMeetingNotes(e.target.value)}
          placeholder="Paste notes or transcript…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={importingNotes || !meetingNotes.trim()} onClick={() => void handleImportMeetingNotes()}>
            {importingNotes ? "Importing…" : "Import to update"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={narrativeLoading} onClick={() => void handleUpdateNarrative()}>
            {narrativeLoading ? "Generating…" : "What changed?"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void handleSaveWithSnapshot()}>
            Save with snapshot
          </Button>
        </div>
        {updateNarrative && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{updateNarrative}</p>
        )}
      </section>

      <AiIntakePanel
        projectId={projectId}
        onParsedUpdates={mergeAiUpdates}
        onGapFillApplied={mergeAiUpdates}
      />

      <AiAddonsHub projectId={projectId} scope="project" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          Start with goals, progress, metrics, and risks. Open more fields when
          you need them.
        </p>
        <span role="status" aria-live="polite">
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : lastSaved
                ? "Saved"
                : null}
        </span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabId)}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {ESSENTIAL_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
          {showMore &&
            MORE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs sm:text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
        </TabsList>
        {!showMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowMore(true)}
          >
            Show more fields
          </Button>
        )}

      <TabsContent value="goals" className="space-y-3">
        <section className="space-y-3">
          <Label>Goals</Label>
          {data.goals.map((goal, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={goal}
                onChange={(e) => updateListItem("goals", i, e.target.value)}
                placeholder="Goal…"
                aria-label={`Goal ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeListItem("goals", i)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addListItem("goals")}>
            Add goal
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="progress" className="mt-4">
        <section className="space-y-2">
          <Label htmlFor="progress">Progress summary</Label>
          <textarea
            id="progress"
            rows={6}
            value={data.progress ?? ""}
            onChange={(e) => setData((prev) => ({ ...prev, progress: e.target.value }))}
            placeholder="Summarize overall progress…"
            className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Label className="mt-4">Completed work</Label>
          {data.completed_work.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updateListItem("completed_work", i, e.target.value)}
                placeholder="Completed item…"
                aria-label={`Completed work item ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeListItem("completed_work", i)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addListItem("completed_work")}
          >
            Add item
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="tasks" className="mt-4">
        <section className="space-y-3">
          <Label>Current tasks</Label>
          {data.current_tasks.map((task, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={task.title}
                onChange={(e) => {
                  const tasks = [...data.current_tasks];
                  tasks[i] = { ...tasks[i], title: e.target.value };
                  setData((prev) => ({ ...prev, current_tasks: tasks }));
                }}
                placeholder="Task title…"
                className="flex-1"
                aria-label={`Task ${i + 1} title`}
              />
              <Input
                value={task.status ?? ""}
                onChange={(e) => {
                  const tasks = [...data.current_tasks];
                  tasks[i] = { ...tasks[i], status: e.target.value };
                  setData((prev) => ({ ...prev, current_tasks: tasks }));
                }}
                placeholder="Status"
                className="w-32"
                aria-label={`Task ${i + 1} status`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    current_tasks: prev.current_tasks.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                current_tasks: [...prev.current_tasks, { title: "", status: "in_progress" }],
              }))
            }
          >
            Add task
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="milestones" className="mt-4">
        <section className="space-y-3">
          <Label>Milestones</Label>
          {data.milestones.map((milestone, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={milestone.title}
                onChange={(e) => {
                  const milestones = [...data.milestones];
                  milestones[i] = { ...milestones[i], title: e.target.value };
                  setData((prev) => ({ ...prev, milestones }));
                }}
                placeholder="Milestone…"
                className="flex-1"
                aria-label={`Milestone ${i + 1} title`}
              />
              <Input
                type="date"
                value={milestone.date ?? ""}
                onChange={(e) => {
                  const milestones = [...data.milestones];
                  milestones[i] = { ...milestones[i], date: e.target.value };
                  setData((prev) => ({ ...prev, milestones }));
                }}
                className="w-40"
                aria-label={`Milestone ${i + 1} date`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    milestones: prev.milestones.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                milestones: [...prev.milestones, { title: "", status: "pending" }],
              }))
            }
          >
            Add milestone
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="metrics" className="mt-4">
        <section className="space-y-3">
          <div>
            <Label>Metrics</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Display value is shown on slides; chart number powers chart
              layouts (auto-filled when possible from values like 42% or $1.2k).
            </p>
          </div>
          {data.metrics.map((metric, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_8rem_7rem_auto]"
            >
              <div className="space-y-1">
                <Label htmlFor={`metric-label-${i}`}>Label</Label>
                <Input
                  id={`metric-label-${i}`}
                  value={metric.label}
                  onChange={(e) => {
                    const metrics = [...data.metrics];
                    metrics[i] = { ...metrics[i], label: e.target.value };
                    setData((prev) => ({ ...prev, metrics }));
                  }}
                  placeholder="e.g. Adoption"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`metric-value-${i}`}>Display value</Label>
                <Input
                  id={`metric-value-${i}`}
                  value={metric.value}
                  onChange={(e) => {
                    const metrics = [...data.metrics];
                    const raw = e.target.value;
                    const parsed = Number.parseFloat(
                      raw.replace(/[$,%\s]/g, "").replace(/k$/i, "")
                    );
                    metrics[i] = {
                      ...metrics[i],
                      value: raw,
                      numericValue: Number.isFinite(parsed)
                        ? raw.toLowerCase().includes("k")
                          ? parsed * 1000
                          : parsed
                        : metrics[i].numericValue,
                    };
                    setData((prev) => ({ ...prev, metrics }));
                  }}
                  placeholder="42%"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`metric-numeric-${i}`}>Chart number</Label>
                <Input
                  id={`metric-numeric-${i}`}
                  type="number"
                  value={metric.numericValue ?? ""}
                  onChange={(e) => {
                    const metrics = [...data.metrics];
                    const numericValue =
                      e.target.value === ""
                        ? null
                        : Number.parseFloat(e.target.value);
                    metrics[i] = {
                      ...metrics[i],
                      numericValue: Number.isFinite(numericValue as number)
                        ? (numericValue as number)
                        : null,
                    };
                    setData((prev) => ({ ...prev, metrics }));
                  }}
                  placeholder="42"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`metric-trend-${i}`}>Trend</Label>
                <select
                  id={`metric-trend-${i}`}
                  value={metric.trend ?? ""}
                  onChange={(e) => {
                    const metrics = [...data.metrics];
                    metrics[i] = {
                      ...metrics[i],
                      trend: (e.target.value || undefined) as
                        | "up"
                        | "down"
                        | "flat"
                        | undefined,
                    };
                    setData((prev) => ({ ...prev, metrics }));
                  }}
                  className="flex h-10 w-full rounded-md border border-border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      metrics: prev.metrics.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                metrics: [...prev.metrics, { label: "", value: "" }],
              }))
            }
          >
            Add metric
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="risks" className="mt-4">
        <section className="space-y-3">
          <Label>Risks</Label>
          {data.risks.map((risk, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={risk.title}
                onChange={(e) => {
                  const risks = [...data.risks];
                  risks[i] = { ...risks[i], title: e.target.value };
                  setData((prev) => ({ ...prev, risks }));
                }}
                placeholder="Risk…"
                className="flex-1"
                aria-label={`Risk ${i + 1}`}
              />
              <Input
                value={risk.severity ?? ""}
                onChange={(e) => {
                  const risks = [...data.risks];
                  risks[i] = { ...risks[i], severity: e.target.value };
                  setData((prev) => ({ ...prev, risks }));
                }}
                placeholder="Severity"
                className="w-28"
                aria-label={`Risk ${i + 1} severity`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    risks: prev.risks.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                risks: [...prev.risks, { title: "", severity: "medium" }],
              }))
            }
          >
            Add risk
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="blockers" className="mt-4">
        <section className="space-y-3">
          <Label>Blockers</Label>
          {data.blockers.map((blocker, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={blocker}
                onChange={(e) => updateListItem("blockers", i, e.target.value)}
                placeholder="Blocker…"
                aria-label={`Blocker ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeListItem("blockers", i)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addListItem("blockers")}
          >
            Add blocker
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="next_steps" className="mt-4">
        <section className="space-y-3">
          <Label>Next steps</Label>
          {data.next_steps.map((step, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={step}
                onChange={(e) => updateListItem("next_steps", i, e.target.value)}
                placeholder="Next step…"
                aria-label={`Next step ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeListItem("next_steps", i)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addListItem("next_steps")}
          >
            Add step
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="screenshots" className="mt-4">
        <section className="space-y-4">
          <form onSubmit={handleScreenshotUpload} className="space-y-3 rounded-lg border border-border p-4">
            <Label htmlFor="screenshot">Upload screenshot</Label>
            <Input id="screenshot" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
            <Input
              id="screenshot-caption"
              name="caption"
              placeholder="Caption (optional)"
              aria-label="Screenshot caption"
            />
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </form>
          {data.screenshots.length > 0 && (
            <ul className="space-y-2">
              {data.screenshots.map((shot, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
                >
                  {shot.caption || shot.path}
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      </Tabs>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">
          {saving ? "Saving…" : lastSaved ? "Saved" : "Changes autosave"}
        </span>
        <Button onClick={handleSave} disabled={saving} variant="outline">
          {saving ? "Saving…" : "Save now"}
        </Button>
      </div>
    </div>
  );
}
