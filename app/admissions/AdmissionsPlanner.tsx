"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Application = {
  id: string; institute: string; programme: string; stage: string; deadline: string | null;
  next_action: string; official_url: string; notes: string;
};
type Task = { id: string; title: string; category: string; due_date: string | null; completed: boolean };
type Story = {
  id: string; title: string; competency: string; situation: string; action: string;
  result: string; evidence: string; confidence: number;
};
type Practice = {
  id: string; kind: string; institute: string; prompt: string; scheduled_for: string | null;
  status: string; feedback: string;
};
type ExamResult = {
  id: string; exam: string; score: number | string | null; overall_percentile: number | string | null;
  varc_percentile: number | string | null; dilr_percentile: number | string | null;
  qa_percentile: number | string | null; result_date: string | null;
};
type AdmissionsState = {
  applications: Application[]; tasks: Task[]; stories: Story[]; practices: Practice[]; results: ExamResult[];
};
type Tab = "dashboard" | "pipeline" | "profile" | "practice" | "decision";

const EMPTY_STATE: AdmissionsState = { applications: [], tasks: [], stories: [], practices: [], results: [] };
const STAGES = ["researching", "applying", "submitted", "shortlisted", "interviewed", "waitlisted", "converted", "closed"];
const STAGE_LABELS: Record<string, string> = {
  researching: "Researching", applying: "Applying", submitted: "Submitted", shortlisted: "Shortlisted",
  interviewed: "Interviewed", waitlisted: "Waitlisted", converted: "Converted", closed: "Closed",
};

function dateKey(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const key = dateKey(value);
  if (!key) return "Date unavailable";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", options);
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || "Admissions request failed.";
}

export function AdmissionsPlanner() {
  const [data, setData] = useState<AdmissionsState>(EMPTY_STATE);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch("/api/admissions", { cache: "no-store" });
    if (response.status === 401) { setNeedsLogin(true); setLoading(false); return; }
    if (!response.ok) { setError(await responseError(response)); setLoading(false); return; }
    setData(await response.json() as AdmissionsState);
    setNeedsLogin(false); setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(method: "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>, query = "") {
    setBusy(true); setError("");
    const response = await fetch(`/api/admissions${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) setError(await responseError(response));
    else await load();
    setBusy(false);
    return response.ok;
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    });
    if (!response.ok) { setLoginError(await responseError(response)); return; }
    await load();
  }

  async function create(event: FormEvent<HTMLFormElement>, resource: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    if (await mutate("POST", { resource, ...values })) { form.reset(); setOpenForm(null); }
  }

  async function remove(resource: string, id: string) {
    if (!window.confirm("Remove this record?")) return;
    await mutate("DELETE", undefined, `?resource=${resource}&id=${encodeURIComponent(id)}`);
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const activeApplications = data.applications.filter(item => !["closed", "converted"].includes(item.stage));
  const nextDeadlines = useMemo(() => [
    ...data.tasks.filter(item => !item.completed).flatMap(item => {
      const date = dateKey(item.due_date);
      return date ? [{ id: item.id, date, label: item.title, type: "Task" }] : [];
    }),
    ...activeApplications.flatMap(item => {
      const date = dateKey(item.deadline);
      return date ? [{ id: item.id, date, label: `${item.institute} · ${item.next_action || "Application deadline"}`, type: "Application" }] : [];
    }),
  ].filter(item => item.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6), [activeApplications, data.tasks, today]);
  const nextAction = nextDeadlines[0];
  const converted = data.applications.filter(item => item.stage === "converted").length;
  const upcomingPractice = data.practices.filter(item => item.status !== "completed").length;

  if (needsLogin) return <main className="ad-shell"><div className="ad-login-wrap"><form className="ad-login" onSubmit={login}>
    <span className="ad-kicker">PRIVATE WORKSPACE</span><h1>Unlock admissions</h1>
    <p>Use the same owner password as your CAT Prep control room.</p>
    <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
    {loginError && <p className="ad-error">{loginError}</p>}
    <button className="ad-button" type="submit">Enter control room</button><Link href="/">← Back to CAT Prep</Link>
  </form></div></main>;

  return <main className="ad-shell">
    <header className="ad-header">
      <Link className="ad-brand" href="/admissions"><span>A</span><b>ADMISSIONS // HQ</b></Link>
      <nav>{(["dashboard", "pipeline", "profile", "practice", "decision"] as Tab[]).map(item =>
        <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <Link className="ad-mode" href="/">CAT Prep ↗</Link>
    </header>

    {error && <div className="ad-alert"><b>SETUP / STORAGE</b><span>{error}</span></div>}
    {loading ? <div className="ad-loading">Loading admissions workspace…</div> : <>
      {tab === "dashboard" && <>
        <section className="ad-hero">
          <div><span className="ad-kicker">POST-EXAM COMMAND CENTRE</span><h1>Turn the score<br />into the <em>right admit.</em></h1>
          <p>Deadlines, applications, interviews and decisions—one honest operating system for everything after CAT.</p></div>
          <aside><span>NEXT CONSEQUENTIAL MOVE</span><strong>{nextAction?.label || "Build your admissions pipeline"}</strong><small>{nextAction ? formatDate(nextAction.date, { day: "numeric", month: "long", year: "numeric" }) : "Add an application or task to begin"}</small></aside>
        </section>
        <section className="ad-metrics">
          <div><span>ACTIVE APPLICATIONS</span><b>{activeApplications.length}</b></div><div><span>SHORTLISTS</span><b>{data.applications.filter(item => item.stage === "shortlisted").length}</b></div>
          <div><span>CONVERTS</span><b>{converted}</b></div><div><span>PRACTICE QUEUE</span><b>{upcomingPractice}</b></div>
        </section>
        <section className="ad-grid-two">
          <div className="ad-panel"><div className="ad-panel-head"><div><span className="ad-kicker">01 // ACT</span><h2>Priority queue</h2></div><button onClick={() => setOpenForm(openForm === "task" ? null : "task")}>+ Task</button></div>
            {openForm === "task" && <form className="ad-inline-form" onSubmit={event => create(event, "task")}><input name="title" placeholder="What needs to happen?" required /><select name="category"><option>Application</option><option>Interview</option><option>Document</option><option>Decision</option></select><input name="due_date" type="date" /><button disabled={busy}>Save</button></form>}
            <div className="ad-task-list">{data.tasks.length ? data.tasks.slice(0, 8).map(item => <article className={item.completed ? "done" : ""} key={item.id}>
              <button className="ad-check" onClick={() => mutate("PATCH", { resource: "task", id: item.id, completed: !item.completed })}>{item.completed ? "✓" : ""}</button>
              <div><b>{item.title}</b><small>{item.category}{item.due_date ? ` · ${item.due_date}` : ""}</small></div><button className="ad-delete" onClick={() => remove("task", item.id)}>×</button>
            </article>) : <p className="ad-empty">No tasks yet. Add the next action that could otherwise slip.</p>}</div>
          </div>
          <div className="ad-panel"><div className="ad-panel-head"><div><span className="ad-kicker">02 // WATCH</span><h2>Deadline radar</h2></div></div>
            <div className="ad-deadlines">{nextDeadlines.length ? nextDeadlines.map(item => <article key={`${item.type}-${item.id}`}><time>{formatDate(item.date, { day: "2-digit", month: "short" })}</time><div><b>{item.label}</b><small>{item.type}</small></div></article>) : <p className="ad-empty">Upcoming dated tasks and applications appear here.</p>}</div>
          </div>
        </section>
        <ResultSection results={data.results} open={openForm === "result"} setOpen={() => setOpenForm(openForm === "result" ? null : "result")} create={create} busy={busy} remove={remove} />
      </>}

      {tab === "pipeline" && <section className="ad-page-section"><SectionTitle number="01" title="Institute pipeline" copy="Move every programme from research to a recorded outcome." action="+ Application" onAction={() => setOpenForm(openForm === "application" ? null : "application")} />
        {openForm === "application" && <form className="ad-card-form" onSubmit={event => create(event, "application")}>
          <label>Institute<input name="institute" required /></label><label>Programme<input name="programme" placeholder="PGP / MBA" /></label><label>Stage<select name="stage">{STAGES.map(stage => <option value={stage} key={stage}>{STAGE_LABELS[stage]}</option>)}</select></label>
          <label>Deadline<input name="deadline" type="date" /></label><label className="wide">Next action<input name="next_action" placeholder="Submit form, prepare SOP, confirm documents…" /></label><label className="wide">Official URL<input name="official_url" type="url" /></label><label className="full">Notes<textarea name="notes" /></label><button className="ad-button" disabled={busy}>Save application</button>
        </form>}
        <div className="ad-pipeline">{data.applications.length ? data.applications.map(item => <article key={item.id}>
          <div className="ad-app-top"><span>{item.stage}</span><button onClick={() => remove("application", item.id)}>×</button></div><h3>{item.institute}</h3><p>{item.programme || "Programme not specified"}</p>
          <label>Stage<select value={item.stage} onChange={event => mutate("PATCH", { resource: "application", id: item.id, stage: event.target.value, next_action: item.next_action, deadline: item.deadline, notes: item.notes })}>{STAGES.map(stage => <option value={stage} key={stage}>{STAGE_LABELS[stage]}</option>)}</select></label>
          <div className="ad-app-meta"><span>{item.deadline || "No deadline"}</span>{item.official_url && <a href={item.official_url} target="_blank" rel="noreferrer">Official ↗</a>}</div><b className="ad-next">{item.next_action || "Define the next action"}</b>
        </article>) : <p className="ad-empty ad-wide-empty">Your application pipeline is empty.</p>}</div>
      </section>}

      {tab === "profile" && <section className="ad-page-section"><SectionTitle number="02" title="Story bank" copy="Turn experience into evidence-backed interview stories." action="+ Story" onAction={() => setOpenForm(openForm === "story" ? null : "story")} />
        {openForm === "story" && <form className="ad-card-form" onSubmit={event => create(event, "story")}><label>Story title<input name="title" required /></label><label>Competency<input name="competency" placeholder="Leadership, conflict, failure…" /></label><label>Confidence<select name="confidence"><option value="1">1 · Weak</option><option value="2">2</option><option value="3">3 · Developing</option><option value="4">4</option><option value="5">5 · Ready</option></select></label><label className="full">Situation<textarea name="situation" /></label><label className="full">Action<textarea name="action" /></label><label className="full">Result<textarea name="result" /></label><label className="full">Evidence / metrics<input name="evidence" /></label><button className="ad-button" disabled={busy}>Save story</button></form>}
        <div className="ad-story-grid">{data.stories.length ? data.stories.map(item => <article key={item.id}><div><span>{item.competency || "General"}</span><button onClick={() => remove("story", item.id)}>×</button></div><h3>{item.title}</h3><small>CONFIDENCE {item.confidence}/5</small><p><b>S</b>{item.situation || "Add the situation"}</p><p><b>A</b>{item.action || "Add your action"}</p><p><b>R</b>{item.result || "Add the result"}</p>{item.evidence && <em>{item.evidence}</em>}</article>) : <p className="ad-empty ad-wide-empty">Build reusable stories for leadership, failure, impact and conflict questions.</p>}</div>
      </section>}

      {tab === "practice" && <section className="ad-page-section"><SectionTitle number="03" title="WAT / PI practice" copy="Plan prompts, capture feedback, and close the loop." action="+ Practice" onAction={() => setOpenForm(openForm === "practice" ? null : "practice")} />
        {openForm === "practice" && <form className="ad-card-form" onSubmit={event => create(event, "practice")}><label>Type<select name="kind"><option>PI</option><option>Mock interview</option><option>WAT</option><option>GD</option></select></label><label>Institute<input name="institute" /></label><label>Scheduled<input name="scheduled_for" type="date" /></label><label className="full">Prompt / focus<textarea name="prompt" required /></label><label className="full">Initial notes<textarea name="feedback" /></label><button className="ad-button" disabled={busy}>Add to practice queue</button></form>}
        <div className="ad-practice-list">{data.practices.length ? data.practices.map(item => <article key={item.id}><div><span>{item.kind}</span><small>{item.scheduled_for || "Unscheduled"}</small></div><h3>{item.prompt}</h3><p>{item.institute || "General preparation"}</p>{item.feedback && <blockquote>{item.feedback}</blockquote>}<footer><select value={item.status} onChange={event => mutate("PATCH", { resource: "practice", id: item.id, status: event.target.value, feedback: item.feedback })}><option value="planned">Planned</option><option value="attempted">Attempted</option><option value="completed">Completed</option></select><button onClick={() => remove("practice", item.id)}>Remove</button></footer></article>) : <p className="ad-empty ad-wide-empty">No practice sessions queued.</p>}</div>
      </section>}

      {tab === "decision" && <section className="ad-page-section"><SectionTitle number="04" title="Decision centre" copy="See converts and waitlists without losing sight of deadlines." />
        <div className="ad-decision-grid"><div className="ad-panel"><span className="ad-kicker">CONVERTED</span><h2>{converted}</h2>{data.applications.filter(item => item.stage === "converted").map(item => <article key={item.id}><b>{item.institute}</b><span>{item.programme}</span></article>)}{!converted && <p className="ad-empty">Converted offers will appear here automatically.</p>}</div>
        <div className="ad-panel"><span className="ad-kicker">WAITLISTED</span><h2>{data.applications.filter(item => item.stage === "waitlisted").length}</h2>{data.applications.filter(item => item.stage === "waitlisted").map(item => <article key={item.id}><b>{item.institute}</b><span>{item.next_action || item.programme}</span></article>)}</div>
        <div className="ad-panel ad-decision-note"><span className="ad-kicker">DECISION RULE</span><h3>Choose deliberately, not reactively.</h3><p>Cost, roles, curriculum, location, culture and personal fit belong in the comparison. A weighted decision matrix is planned for the next iteration.</p></div></div>
      </section>}
    </>}
  </main>;
}

function SectionTitle({ number, title, copy, action, onAction }: { number: string; title: string; copy: string; action?: string; onAction?: () => void }) {
  return <div className="ad-section-title"><div><span className="ad-kicker">{number} {"//"} OPERATE</span><h1>{title}</h1></div><p>{copy}</p>{action && <button className="ad-button" onClick={onAction}>{action}</button>}</div>;
}

function ResultSection({ results, open, setOpen, create, busy, remove }: { results: ExamResult[]; open: boolean; setOpen: () => void; create: (event: FormEvent<HTMLFormElement>, resource: string) => Promise<void>; busy: boolean; remove: (resource: string, id: string) => Promise<void> }) {
  return <section className="ad-results"><div className="ad-panel-head"><div><span className="ad-kicker">03 // CALIBRATE</span><h2>Results snapshot</h2></div><button onClick={setOpen}>+ Result</button></div>
    {open && <form className="ad-inline-form ad-result-form" onSubmit={event => create(event, "result")}><input name="exam" placeholder="CAT 2026" required /><input name="score" type="number" step="0.01" placeholder="Score" /><input name="overall_percentile" type="number" step="0.01" placeholder="Overall %ile" /><input name="varc_percentile" type="number" step="0.01" placeholder="VARC" /><input name="dilr_percentile" type="number" step="0.01" placeholder="DILR" /><input name="qa_percentile" type="number" step="0.01" placeholder="QA" /><input name="result_date" type="date" /><button disabled={busy}>Save</button></form>}
    <div className="ad-result-grid">{results.length ? results.map(item => <article key={item.id}><button onClick={() => remove("result", item.id)}>×</button><span>{item.exam}</span><b>{item.overall_percentile ?? "—"}<small>%ILE</small></b><div><em>VARC {item.varc_percentile ?? "—"}</em><em>DILR {item.dilr_percentile ?? "—"}</em><em>QA {item.qa_percentile ?? "—"}</em></div></article>) : <p className="ad-empty">Results can be added when scorecards arrive.</p>}</div>
  </section>;
}
