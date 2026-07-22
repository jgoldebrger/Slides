import type { DeckOutline } from "@/types/slide";
import { addonById, type AiAddonFeatureId } from "@/lib/ai/addons/catalog";
import * as g from "@/lib/ai/addons/cluster-g";
import * as h from "@/lib/ai/addons/cluster-h";
import * as i from "@/lib/ai/addons/cluster-i";
import * as j from "@/lib/ai/addons/cluster-j";
import * as k from "@/lib/ai/addons/cluster-k";
import * as l from "@/lib/ai/addons/cluster-l";
import * as m from "@/lib/ai/addons/cluster-m";
import * as n from "@/lib/ai/addons/cluster-n";
import * as o from "@/lib/ai/addons/cluster-o";

export type AddonRunContext = {
  projectName?: string;
  projectId?: string;
  deckName?: string;
  updates?: Record<string, unknown>;
  previousUpdates?: Record<string, unknown>;
  outline?: DeckOutline | null;
  slides?: Array<{ id?: string; title: string; content?: unknown; speaker_notes?: string }>;
  slideIndex?: number;
  text?: string;
  selection?: string;
  roster?: string[];
  role?: string;
  promptHash?: string;
  generationId?: string;
  revisionId?: string;
  views?: Array<{ slideIndex: number; seconds: number }>;
  payload?: Record<string, unknown>;
};

export async function runAddonById(
  featureId: AiAddonFeatureId,
  ctx: AddonRunContext
): Promise<unknown> {
  const meta = addonById(featureId);
  if (!meta) throw new Error(`Unknown addon: ${featureId}`);

  const updates = ctx.updates ?? {};
  const outline = ctx.outline ?? { slides: [] };
  const text = ctx.text ?? "";
  const projectName = ctx.projectName ?? "Project";
  const slides = ctx.slides ?? [];

  switch (meta.num) {
    case 1:
      return g.g01ScreenshotMetrics(projectName, text);
    case 2:
      return g.g02FigmaPaste(projectName, text);
    case 3:
      return g.g03WikiImport(projectName, text);
    case 4:
      return g.g04CsvMetrics(text);
    case 5:
      return g.g05CalendarParse(text);
    case 6:
      return g.g06PrdRfc(text);
    case 7:
      return g.g07QuoteBank(text);
    case 8:
      return g.g08IncidentDigest(text);
    case 9:
      return g.g09OkrImport(text);
    case 10:
      return g.g10MultiProjectSplit(text);
    case 11:
      return g.g11LangDetect(text);
    case 12:
      return g.g12EvidenceLocker(ctx.deckName ?? "file", text);
    case 13:
      return h.h13StakeholderMap(updates);
    case 14:
      return h.h14HypothesisBet((updates.goals as string[]) ?? []);
    case 15:
      return h.h15AntiSlide(outline as DeckOutline);
    case 16:
      return h.h16TimelineLayout(updates.milestones);
    case 17:
      return h.h17ContrastSlide(
        JSON.stringify(ctx.previousUpdates ?? {}),
        JSON.stringify(updates)
      );
    case 18:
      return h.h18OpenerQuestion(text);
    case 19:
      return h.h19ParkingLot(outline as DeckOutline);
    case 20:
      return h.h20AgendaTimebox(outline as DeckOutline, Number(ctx.payload?.totalMinutes ?? 30));
    case 21:
      return h.h21RedTeam(outline as DeckOutline);
    case 22:
      return h.h22BoardOpsFork(outline as DeckOutline);
    case 23:
      return h.h23ContinuityCheck(outline as DeckOutline);
    case 24:
      return h.h24TitleAb(
        slides[ctx.slideIndex ?? 0]?.title ?? "Slide",
        text
      );
    case 25:
      return i.i25SparklineHistory(
        (ctx.payload?.snapshots as Array<{ label: string; value: number }>) ?? []
      );
    case 26:
      return i.i26TableInsights(text);
    case 27:
      return i.i27UnitsLocale(slides);
    case 28:
      return i.i28IconSuggest(text.split("\n").filter(Boolean));
    case 29:
      return i.i29WhitespaceCoach(text);
    case 30:
      return i.i30CalloutHierarchy(updates.metrics);
    case 31:
      return i.i31RiskHeat(updates.risks);
    case 32:
      return i.i32DependencyGraph(updates.blockers);
    case 33:
      return i.i33ComparisonFrame(updates, ctx.previousUpdates ?? {});
    case 34:
      return i.i34FootnoteStrip(text);
    case 35:
      return i.i35AltGrader(text, slides[ctx.slideIndex ?? 0]?.title ?? "Slide");
    case 36:
      return i.i36SoWhatFooter(text);
    case 37:
      return j.j37SelectionRewrite(text, ctx.selection ?? text, ctx.payload?.instruction as string ?? "improve");
    case 38:
      return j.j38VoiceMatch(text, ctx.payload?.targetText as string ?? "");
    case 39:
      return j.j39JargonTranslate(text);
    case 40:
      return j.j40ActiveVoice(text);
    case 41:
      return j.j41NumberHighlight(text, updates);
    case 42:
      return j.j42CommitMessage(
        ctx.payload?.before as string ?? "",
        ctx.payload?.after as string ?? text
      );
    case 43:
      return j.j43ConflictMerge(
        ctx.payload?.versionA as string ?? "",
        ctx.payload?.versionB as string ?? ""
      );
    case 44:
      return j.j44LayoutPasteFix(text);
    case 45:
      return j.j45CommentApply(text, JSON.stringify(slides[ctx.slideIndex ?? 0]?.content ?? {}));
    case 46:
      return j.j46SlideTwin(
        { title: slides[0]?.title ?? "", body: text },
        (ctx.payload?.candidates as Array<{ deckName: string; title: string; body: string }>) ?? []
      );
    case 47:
      return j.j47A11yAutofix(slides[ctx.slideIndex ?? 0]);
    case 48:
      return j.j48KillDarlings(text);
    case 49:
      return k.k49Teleprompter(slides, ctx.slideIndex ?? 0);
    case 50:
      return k.k50SlowDownCue(
        Number(ctx.payload?.remainingMinutes ?? 10),
        slides.length - (ctx.slideIndex ?? 0),
        Number(ctx.payload?.paceMinutes ?? 30)
      );
    case 51:
      return k.k51RoomCaptions(text);
    case 52:
      return k.k52CrmNote(ctx.deckName ?? "Deck", slides);
    case 53:
      return k.k53AssigneeGuess(
        text.split("\n").filter(Boolean),
        ctx.roster ?? []
      );
    case 54:
      return k.k54ShareGate(text, ctx.deckName ?? "Deck");
    case 55:
      return k.k55ViewAnalytics(ctx.views ?? []);
    case 56:
      return k.k56AsyncVideoScript(ctx.deckName ?? "Deck", slides);
    case 57:
      return k.k57QaParkingExport(text.split("\n").filter(Boolean));
    case 58:
      return k.k58DecisionLog(slides);
    case 59:
      return k.k59ReminderDrip((updates.risks as string[]) ?? []);
    case 60:
      return k.k60ReplayChapters(
        slides.map((s) => ({ title: s.title })),
        Number(ctx.payload?.durationSec ?? 600)
      );
    case 61:
      return l.l61DependencyRadar(
        (ctx.payload?.projects as Array<{ name: string; blockers: unknown }>) ?? []
      );
    case 62:
      return l.l62ThemeCluster((ctx.payload?.updatesList as unknown[]) ?? [updates]);
    case 63:
      return l.l63ExecDigest(
        (ctx.payload?.decks as Array<{ name: string; outline: unknown }>) ?? []
      );
    case 64:
      return l.l64Scorecard(updates.metrics);
    case 65:
      return l.l65ChurnRisk(updates);
    case 66:
      return l.l66BenchmarkAnon(ctx.payload?.peerStats ?? {});
    case 67:
      return l.l67PlaybookRecommend(outline);
    case 68:
      return l.l68SkillGap(updates.blockers);
    case 69:
      return l.l69BudgetNarrative(text);
    case 70:
      return l.l70CompliancePack(slides, updates);
    case 71:
      return l.l71TemplateLearn((ctx.payload?.decks as unknown[]) ?? []);
    case 72:
      return l.l72StakeholderPrefs(text);
    case 73:
      return m.m73Groundedness(
        Number(ctx.payload?.citationCount ?? 0),
        Number(ctx.payload?.claimCount ?? 1)
      );
    case 74:
      return m.m74PromptPin(ctx.promptHash ?? "");
    case 75:
      return m.m75DiffExplain(
        ctx.payload?.before as string ?? "",
        ctx.payload?.after as string ?? text
      );
    case 76:
      return m.m76PiiScrub(text);
    case 77:
      return m.m77SecretScan(text);
    case 78:
      return m.m78ModelRouter(featureId);
    case 79:
      return m.m79EvalHarness(outline, ctx.payload?.golden ?? {});
    case 80:
      return m.m80FeedbackLoop(
        Boolean(ctx.payload?.thumbsUp),
        featureId,
        text
      );
    case 81:
      return m.m81WatermarkMeta(ctx.generationId ?? "", ctx.promptHash ?? "");
    case 82:
      return m.m82RoleAllowlist(ctx.role ?? "member", featureId);
    case 83:
      return m.m83RetentionPolicy(
        Number(ctx.payload?.activityCount ?? 0),
        Number(ctx.payload?.genCount ?? 0)
      );
    case 84:
      return m.m84IncidentRollback(ctx.revisionId ?? "", text);
    case 85:
      return n.n85SlackStatus(outline, text || "general");
    case 86:
      return n.n86TeamsCard(ctx.deckName ?? "Deck", outline);
    case 87:
      return n.n87TicketAutolink(text);
    case 88:
      return n.n88GithubReleases(text);
    case 89:
      return n.n89MeetSummary(text);
    case 90:
      return n.n90WebhookIntake(ctx.payload ?? {});
    case 91:
      return n.n91ChromeClip(text, (ctx.payload?.url as string) ?? "");
    case 92:
      return n.n92MobileVoice(text, projectName);
    case 93:
      return n.n93FridayAgent(projectName, updates);
    case 94:
      return n.n94ApprovalAgent(
        ctx.deckName ?? "Deck",
        ctx.roster ?? []
      );
    case 95:
      return o.o95MoodboardTheme(text);
    case 96:
      return o.o96HumorDial(text, Number(ctx.payload?.level ?? 2));
    case 97:
      return o.o97Eli5Mode(text);
    case 98:
      return o.o98CompetitiveTeardown(text);
    case 99:
      return o.o99WinReel(updates);
    case 100:
      return o.o100PairPresenter(text, { slides, updates });
    default:
      throw new Error(`Unhandled addon num ${meta.num}`);
  }
}

export * from "@/lib/ai/addons/catalog";
export * from "@/lib/ai/addons/helpers";
