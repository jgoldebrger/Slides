import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";

export type E2ESeed = {
  orgId: string;
  projectId: string;
  readyDeckId: string;
  failedDeckId: string;
  shareToken: string;
  shareViewPath: string;
};

const READY_NAME = "E2E Ready Deck";
const FAILED_NAME = "E2E Failed Deck";
const PROJECT_NAME = "E2E Test Project";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readSeed(): E2ESeed | null {
  const seedPath = path.join(__dirname, "../.auth/seed.json");
  if (!fs.existsSync(seedPath)) return null;
  return JSON.parse(fs.readFileSync(seedPath, "utf8")) as E2ESeed;
}

/**
 * Seeds deterministic decks for authenticated E2E.
 * Requires SUPABASE_SERVICE_ROLE_KEY + E2E_TEST_EMAIL.
 * Returns null when admin credentials are unavailable.
 */
export async function seedE2EWorkspace(): Promise<E2ESeed | null> {
  const supabase = adminClient();
  const email = process.env.E2E_TEST_EMAIL;
  if (!supabase || !email) return null;

  const { data: usersData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(listError.message);

  const user = usersData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    throw new Error(`E2E user not found: ${email}`);
  }

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memberError || !membership) {
    throw new Error("E2E user has no organization membership");
  }

  const orgId = membership.org_id as string;

  let { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", PROJECT_NAME)
    .maybeSingle();

  if (!project) {
    const { data: created, error } = await supabase
      .from("projects")
      .insert({
        org_id: orgId,
        name: PROJECT_NAME,
        description: "Seeded for Playwright E2E",
        status: "active",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    project = created;
    await supabase.from("project_updates").insert({
      project_id: project.id,
      goals: ["Ship E2E coverage"],
      progress: "Seeded metrics for chart slides",
      metrics: [
        { label: "Adoption", value: "72%", numericValue: 72 },
        { label: "NPS", value: "45", numericValue: 45 },
      ],
      risks: [{ title: "Flaky CI", severity: "medium" }],
      next_steps: ["Keep smoke green"],
    });
  } else {
    await supabase
      .from("project_updates")
      .upsert(
        {
          project_id: project.id,
          goals: ["Ship E2E coverage"],
          progress: "Seeded metrics for chart slides",
          metrics: [
            { label: "Adoption", value: "72%", numericValue: 72 },
            { label: "NPS", value: "45", numericValue: 45 },
          ],
          risks: [{ title: "Flaky CI", severity: "medium" }],
          next_steps: ["Keep smoke green"],
        },
        { onConflict: "project_id" }
      );
  }

  const readyDeckId = await upsertDeck({
    supabase,
    orgId,
    projectId: project.id,
    userId: user.id,
    name: READY_NAME,
    status: "ready",
  });

  const failedDeckId = await upsertDeck({
    supabase,
    orgId,
    projectId: project.id,
    userId: user.id,
    name: FAILED_NAME,
    status: "failed",
  });

  await ensureSlides(supabase, readyDeckId);
  await ensureSlides(supabase, failedDeckId);
  await ensureRevision(supabase, readyDeckId, orgId, user.id);

  const shareToken = randomBytes(32).toString("base64url");
  await supabase
    .from("deck_share_links")
    .delete()
    .eq("deck_id", readyDeckId)
    .eq("label", "E2E share");

  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  const { error: shareError } = await supabase.from("deck_share_links").insert({
    deck_id: readyDeckId,
    org_id: orgId,
    token_hash: hashShareToken(shareToken),
    label: "E2E share",
    expires_at: expires.toISOString(),
    created_by: user.id,
  });
  if (shareError) throw new Error(shareError.message);

  return {
    orgId,
    projectId: project.id,
    readyDeckId,
    failedDeckId,
    shareToken,
    shareViewPath: `/view/${shareToken}`,
  };
}

async function upsertDeck({
  supabase,
  orgId,
  projectId,
  userId,
  name,
  status,
}: {
  supabase: NonNullable<ReturnType<typeof adminClient>>;
  orgId: string;
  projectId: string;
  userId: string;
  name: string;
  status: string;
}) {
  const { data: existing } = await supabase
    .from("decks")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("decks")
      .update({
        status,
        outline: {
          deckType: "project_status",
          slides: [
            {
              title: "Status overview",
              layout: "bullets",
              type: "content",
              summary: "Seeded overview",
            },
            {
              title: "Metrics",
              layout: "chart",
              type: "content",
              summary: "Seeded chart",
            },
          ],
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("decks")
    .insert({
      org_id: orgId,
      project_id: projectId,
      name,
      type: "project_status",
      status,
      apply_branding: true,
      created_by: userId,
      outline: {
        deckType: "project_status",
        slides: [
          {
            title: "Status overview",
            layout: "bullets",
            type: "content",
            summary: "Seeded overview",
          },
          {
            title: "Metrics",
            layout: "chart",
            type: "content",
            summary: "Seeded chart",
          },
        ],
      },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

async function ensureSlides(
  supabase: NonNullable<ReturnType<typeof adminClient>>,
  deckId: string
) {
  await supabase.from("slides").delete().eq("deck_id", deckId);
  const { error } = await supabase.from("slides").insert([
    {
      deck_id: deckId,
      order: 0,
      type: "content",
      layout: "bullets",
      title: "Status overview",
      content: {
        bullets: ["E2E seed slide", "Deterministic content"],
      },
      speaker_notes: "Seeded notes",
    },
    {
      deck_id: deckId,
      order: 1,
      type: "content",
      layout: "chart",
      title: "Metrics",
      content: {
        chartData: [
          { name: "Adoption", value: 72 },
          { name: "NPS", value: 45 },
        ],
        body: "From project metrics",
      },
      speaker_notes: "",
    },
  ]);
  if (error) throw new Error(error.message);
}

async function ensureRevision(
  supabase: NonNullable<ReturnType<typeof adminClient>>,
  deckId: string,
  orgId: string,
  userId: string
) {
  const { data: existing } = await supabase
    .from("deck_revisions")
    .select("id")
    .eq("deck_id", deckId)
    .limit(1);

  if (existing?.length) return;

  await supabase.from("deck_revisions").insert({
    deck_id: deckId,
    org_id: orgId,
    revision: 1,
    reason: "manual",
    created_by: userId,
    slides_snapshot: [
      {
        order: 0,
        type: "content",
        layout: "bullets",
        title: "Previous version",
        content: { bullets: ["Older snapshot"] },
        speaker_notes: "",
        metadata: {},
      },
    ],
  });
}
