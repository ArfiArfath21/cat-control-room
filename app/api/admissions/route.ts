import { hasOwnerSession, ownerAccessConfigured } from "../_owner-session";
import { ADMISSIONS_OWNER, admissionsDb } from "./_db";

type Resource = "application" | "task" | "story" | "practice" | "result";

async function authorize(request: Request) {
  if (!ownerAccessConfigured()) {
    return Response.json({ error: "CAT_OWNER_PASSWORD is not configured." }, { status: 503 });
  }
  if (!(await hasOwnerSession(request))) {
    return Response.json({ error: "Owner sign-in required." }, { status: 401 });
  }
  return null;
}

function text(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function optionalDate(value: unknown) {
  const candidate = text(value, 30);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resource(value: unknown): Resource | null {
  return ["application", "task", "story", "practice", "result"].includes(String(value))
    ? value as Resource
    : null;
}

function databaseError(error: unknown) {
  console.error("Admissions database error", error instanceof Error ? error.message : "Unknown database error");
  return Response.json({
    error: "Admissions database is unavailable. Confirm POSTGRES_URL and run the Supabase migration.",
  }, { status: 503 });
}

export async function GET(request: Request) {
  const authorizationError = await authorize(request);
  if (authorizationError) return authorizationError;

  try {
    const sql = admissionsDb();
    const [applications, tasks, stories, practices, results] = await Promise.all([
      sql`select * from admissions_applications where owner_id = ${ADMISSIONS_OWNER} order by deadline asc nulls last, created_at desc`,
      sql`select * from admissions_tasks where owner_id = ${ADMISSIONS_OWNER} order by completed asc, due_date asc nulls last, created_at desc`,
      sql`select * from admissions_stories where owner_id = ${ADMISSIONS_OWNER} order by updated_at desc`,
      sql`select * from admissions_practice where owner_id = ${ADMISSIONS_OWNER} order by scheduled_for asc nulls last, created_at desc`,
      sql`select * from admissions_results where owner_id = ${ADMISSIONS_OWNER} order by result_date desc nulls last, created_at desc`,
    ]);
    return Response.json({ applications, tasks, stories, practices, results }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const authorizationError = await authorize(request);
  if (authorizationError) return authorizationError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const selected = resource(body.resource);
  if (!selected) return Response.json({ error: "Invalid admissions resource." }, { status: 400 });

  try {
    const sql = admissionsDb();
    let rows;
    if (selected === "application") {
      const institute = text(body.institute, 160);
      if (!institute) return Response.json({ error: "Institute is required." }, { status: 400 });
      rows = await sql`insert into admissions_applications
        (owner_id, institute, programme, stage, deadline, next_action, official_url, notes)
        values (${ADMISSIONS_OWNER}, ${institute}, ${text(body.programme, 160)}, ${text(body.stage, 40) || "researching"},
          ${optionalDate(body.deadline)}, ${text(body.next_action, 500)}, ${text(body.official_url, 1000)}, ${text(body.notes, 5000)})
        returning *`;
    } else if (selected === "task") {
      const title = text(body.title, 300);
      if (!title) return Response.json({ error: "Task title is required." }, { status: 400 });
      rows = await sql`insert into admissions_tasks (owner_id, title, category, due_date)
        values (${ADMISSIONS_OWNER}, ${title}, ${text(body.category, 80) || "general"}, ${optionalDate(body.due_date)}) returning *`;
    } else if (selected === "story") {
      const title = text(body.title, 200);
      if (!title) return Response.json({ error: "Story title is required." }, { status: 400 });
      rows = await sql`insert into admissions_stories
        (owner_id, title, competency, situation, action, result, evidence, confidence)
        values (${ADMISSIONS_OWNER}, ${title}, ${text(body.competency, 100)}, ${text(body.situation, 3000)},
          ${text(body.action, 3000)}, ${text(body.result, 3000)}, ${text(body.evidence, 1000)},
          ${Math.max(1, Math.min(5, numberOrNull(body.confidence) ?? 3))}) returning *`;
    } else if (selected === "practice") {
      const prompt = text(body.prompt, 3000);
      if (!prompt) return Response.json({ error: "Practice prompt is required." }, { status: 400 });
      rows = await sql`insert into admissions_practice
        (owner_id, kind, institute, prompt, scheduled_for, status, feedback)
        values (${ADMISSIONS_OWNER}, ${text(body.kind, 30) || "PI"}, ${text(body.institute, 160)}, ${prompt},
          ${optionalDate(body.scheduled_for)}, ${text(body.status, 30) || "planned"}, ${text(body.feedback, 5000)}) returning *`;
    } else {
      const exam = text(body.exam, 80);
      if (!exam) return Response.json({ error: "Exam name is required." }, { status: 400 });
      rows = await sql`insert into admissions_results
        (owner_id, exam, score, overall_percentile, varc_percentile, dilr_percentile, qa_percentile, result_date)
        values (${ADMISSIONS_OWNER}, ${exam}, ${numberOrNull(body.score)}, ${numberOrNull(body.overall_percentile)},
          ${numberOrNull(body.varc_percentile)}, ${numberOrNull(body.dilr_percentile)}, ${numberOrNull(body.qa_percentile)},
          ${optionalDate(body.result_date)})
        on conflict (owner_id, exam) do update set
          score = excluded.score, overall_percentile = excluded.overall_percentile,
          varc_percentile = excluded.varc_percentile, dilr_percentile = excluded.dilr_percentile,
          qa_percentile = excluded.qa_percentile, result_date = excluded.result_date, updated_at = now()
        returning *`;
    }
    return Response.json({ item: rows[0] }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  const authorizationError = await authorize(request);
  if (authorizationError) return authorizationError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const selected = resource(body.resource);
  const id = text(body.id, 80);
  if (!selected || !id) return Response.json({ error: "Resource and id are required." }, { status: 400 });

  try {
    const sql = admissionsDb();
    let rows;
    if (selected === "application") {
      rows = await sql`update admissions_applications set
        stage = ${text(body.stage, 40)}, next_action = ${text(body.next_action, 500)},
        deadline = ${optionalDate(body.deadline)}, notes = ${text(body.notes, 5000)}, updated_at = now()
        where id = ${id} and owner_id = ${ADMISSIONS_OWNER} returning *`;
    } else if (selected === "task") {
      rows = await sql`update admissions_tasks set completed = ${Boolean(body.completed)}, updated_at = now()
        where id = ${id} and owner_id = ${ADMISSIONS_OWNER} returning *`;
    } else if (selected === "practice") {
      rows = await sql`update admissions_practice set status = ${text(body.status, 30)},
        feedback = ${text(body.feedback, 5000)}, updated_at = now()
        where id = ${id} and owner_id = ${ADMISSIONS_OWNER} returning *`;
    } else {
      return Response.json({ error: "This resource cannot be updated here." }, { status: 400 });
    }
    if (!rows[0]) return Response.json({ error: "Record not found." }, { status: 404 });
    return Response.json({ item: rows[0] });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: Request) {
  const authorizationError = await authorize(request);
  if (authorizationError) return authorizationError;
  const url = new URL(request.url);
  const selected = resource(url.searchParams.get("resource"));
  const id = text(url.searchParams.get("id"), 80);
  if (!selected || !id) return Response.json({ error: "Resource and id are required." }, { status: 400 });

  try {
    const sql = admissionsDb();
    if (selected === "application") await sql`delete from admissions_applications where id = ${id} and owner_id = ${ADMISSIONS_OWNER}`;
    else if (selected === "task") await sql`delete from admissions_tasks where id = ${id} and owner_id = ${ADMISSIONS_OWNER}`;
    else if (selected === "story") await sql`delete from admissions_stories where id = ${id} and owner_id = ${ADMISSIONS_OWNER}`;
    else if (selected === "practice") await sql`delete from admissions_practice where id = ${id} and owner_id = ${ADMISSIONS_OWNER}`;
    else await sql`delete from admissions_results where id = ${id} and owner_id = ${ADMISSIONS_OWNER}`;
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
