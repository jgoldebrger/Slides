import Link from "next/link";
import {
  FolderKanban,
  Presentation,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { DeckStatusBadge } from "@/components/decks/deck-status-badge";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { deckPrimaryHref, deckTypeLabel } from "@/lib/deck-labels";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/state";
import {
  EntityListEmpty,
  EntityListMeta,
  EntityListPanel,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
  formatListDate,
} from "@/components/shared/entity-list";
import { cn } from "@/lib/utils";

export type DashboardRecentDeck = {
  id: string;
  name: string;
  status: string;
  type: string;
  updatedAt: string;
  projectName?: string;
};

export type DashboardRecentProject = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
};

type DashboardHomeProps = {
  displayName: string;
  orgName: string;
  projectCount: number;
  deckCount: number;
  readyDeckCount: number;
  recentDecks: DashboardRecentDeck[];
  recentProjects: DashboardRecentProject[];
};

type MetricTone = "projects" | "decks" | "ready";

const METRIC_TONES: Record<
  MetricTone,
  { card: string; value: string; icon: string; Icon: LucideIcon }
> = {
  projects: {
    card: "border-info/30 bg-info/10 hover:border-info/50",
    value: "text-info",
    icon: "text-info/80",
    Icon: FolderKanban,
  },
  decks: {
    card: "border-link/30 bg-link/10 hover:border-link/50",
    value: "text-link",
    icon: "text-link/80",
    Icon: Presentation,
  },
  ready: {
    card: "border-success/30 bg-success/10 hover:border-success/50",
    value: "text-success",
    icon: "text-success/80",
    Icon: Sparkles,
  },
};

function MetricCard({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  tone: MetricTone;
}) {
  const { card, value: valueClass, icon, Icon } = METRIC_TONES[tone];

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        card
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("text-3xl font-semibold tracking-tight", valueClass)}>
            {value}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-link/15",
            icon
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  href,
  showLink = true,
}: {
  title: string;
  href: string;
  showLink?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {showLink ? (
        <Link
          href={href}
          className="text-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          View all
        </Link>
      ) : null}
    </div>
  );
}

function ActivitySection({
  title,
  href,
  showLink = true,
  emptyMessage,
  emptyAction,
  children,
  hasItems,
}: {
  title: string;
  href: string;
  showLink?: boolean;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
  hasItems: boolean;
}) {
  return (
    <section>
      <SectionHeader title={title} href={href} showLink={showLink} />
      {hasItems ? (
        <EntityListPanel>{children}</EntityListPanel>
      ) : (
        <EntityListEmpty message={emptyMessage} action={emptyAction} />
      )}
    </section>
  );
}

function RecentDeckRow({ deck }: { deck: DashboardRecentDeck }) {
  return (
    <EntityListRow>
      <EntityListPrimary
        href={deckPrimaryHref(deck.id, deck.status, false)}
        title={deck.name}
        subtitle={
          deck.projectName
            ? `${deck.projectName} · ${deckTypeLabel(deck.type)}`
            : deckTypeLabel(deck.type)
        }
      />
      <EntityListTrailing>
        <DeckStatusBadge status={deck.status} />
        <EntityListMeta>{formatListDate(deck.updatedAt)}</EntityListMeta>
      </EntityListTrailing>
    </EntityListRow>
  );
}

function RecentProjectRow({ project }: { project: DashboardRecentProject }) {
  return (
    <EntityListRow>
      <EntityListPrimary
        href={`/projects/${project.id}`}
        title={project.name}
      />
      <EntityListTrailing>
        <ProjectStatusBadge status={project.status} />
        <EntityListMeta>{formatListDate(project.updatedAt)}</EntityListMeta>
      </EntityListTrailing>
    </EntityListRow>
  );
}

export function DashboardHome({
  displayName,
  orgName,
  projectCount,
  deckCount,
  readyDeckCount,
  recentDecks,
  recentProjects,
}: DashboardHomeProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || displayName;
  const showGettingStarted = projectCount === 0 && deckCount === 0;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {displayName ? `Welcome back, ${firstName}` : "Welcome back"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {orgName}
        </h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          href="/projects"
          label="Projects"
          value={projectCount}
          tone="projects"
        />
        <MetricCard href="/decks" label="Decks" value={deckCount} tone="decks" />
        <MetricCard
          href="/decks"
          label="Ready to present"
          value={readyDeckCount}
          tone="ready"
        />
      </section>

      {showGettingStarted ? (
        <EmptyState
          title="Create your first deck"
          description="Start with a project name and a quick status update — we'll build the slides for you."
          action={
            <Button asChild>
              <Link href="/decks/new">Create deck</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <ActivitySection
            title="Recent decks"
            href="/decks"
            hasItems={recentDecks.length > 0}
            emptyMessage="No decks yet."
            emptyAction={
              <Button asChild size="sm">
                <Link href="/decks/new">Create deck</Link>
              </Button>
            }
          >
            {recentDecks.map((deck) => (
              <RecentDeckRow key={deck.id} deck={deck} />
            ))}
          </ActivitySection>

          <ActivitySection
            title="Recent projects"
            href="/projects"
            showLink={projectCount > 0}
            hasItems={recentProjects.length > 0}
            emptyMessage="No projects yet."
            emptyAction={
              <Button asChild size="sm" variant="outline">
                <Link href="/projects/new">Create project</Link>
              </Button>
            }
          >
            {recentProjects.map((project) => (
              <RecentProjectRow key={project.id} project={project} />
            ))}
          </ActivitySection>
        </div>
      )}
    </div>
  );
}
