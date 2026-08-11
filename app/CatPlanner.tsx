"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SectionKey = "VARC" | "DILR" | "QA";
type Topic = { id: string; name: string; note: string; group: string; priority?: boolean };
type Mock = { id: number; date: string; name: string; varc: number; dilr: number; qa: number; percentile?: number; accuracy?: number; lesson: string };
type Profile = { role: string; target: number; weeklyHours: number; confidence: Record<SectionKey, number> };
type Revision = { nextIndex: number; due: number };

const EXAM_DATE = new Date("2026-11-29T08:30:00+05:30");

const TOPICS: Record<SectionKey, Topic[]> = {
  VARC: [
    { id: "v-main", name: "Main idea & central claim", note: "State the passage in one clean sentence", group: "Reading comprehension", priority: true },
    { id: "v-infer", name: "Inference questions", note: "Prove every choice from the passage", group: "Reading comprehension", priority: true },
    { id: "v-tone", name: "Tone, purpose & viewpoint", note: "Separate author, subject and quoted voices", group: "Reading comprehension" },
    { id: "v-structure", name: "Passage structure", note: "Map how each paragraph moves the argument", group: "Reading comprehension" },
    { id: "v-detail", name: "Detail & application", note: "Return to the exact supporting lines", group: "Reading comprehension" },
    { id: "v-summary", name: "Para summary", note: "Preserve scope, tone and conclusion", group: "Verbal ability", priority: true },
    { id: "v-jumble", name: "Para jumbles", note: "Find mandatory pairs and narrative flow", group: "Verbal ability" },
    { id: "v-odd", name: "Odd sentence out", note: "Build the coherent four-sentence paragraph", group: "Verbal ability" },
    { id: "v-complete", name: "Para completion", note: "Match the logical role of the blank", group: "Verbal ability" },
  ],
  DILR: [
    { id: "d-tables", name: "Tables, graphs & caselets", note: "Ratios, percentages and clean data extraction", group: "Data interpretation", priority: true },
    { id: "d-missing", name: "Missing/incomplete data", note: "Use constraints before calculation", group: "Data interpretation" },
    { id: "d-arrange", name: "Linear & circular arrangements", note: "Represent fixed and relative positions", group: "Logical reasoning", priority: true },
    { id: "d-games", name: "Games & tournaments", note: "Points tables, wins, ties and schedules", group: "Logical reasoning", priority: true },
    { id: "d-select", name: "Selection & distribution", note: "Turn prose into compact cases", group: "Logical reasoning" },
    { id: "d-routes", name: "Routes & networks", note: "Draw the graph before answering", group: "Logical reasoning" },
    { id: "d-rank", name: "Ranking & ordering", note: "Anchor extremes and transitive relations", group: "Logical reasoning" },
    { id: "d-sets", name: "Venn diagrams & set data", note: "Account for intersections and totals", group: "Hybrid sets" },
    { id: "d-max", name: "Maxima, minima & optimisation", note: "Test bounds and feasible cases", group: "Hybrid sets" },
    { id: "d-mixed", name: "Mixed unfamiliar sets", note: "Practise selection, not pattern memorisation", group: "Hybrid sets", priority: true },
  ],
  QA: [
    { id: "q-percent", name: "Percentages, profit & interest", note: "Successive change and base-value clarity", group: "Arithmetic", priority: true },
    { id: "q-ratio", name: "Ratio, proportion & mixtures", note: "Scale, alligation and weighted values", group: "Arithmetic", priority: true },
    { id: "q-average", name: "Averages & weighted averages", note: "Deviation and replacement methods", group: "Arithmetic" },
    { id: "q-work", name: "Time & work", note: "Rates, efficiency and pipes", group: "Arithmetic" },
    { id: "q-speed", name: "Time, speed & distance", note: "Relative speed, trains, boats and races", group: "Arithmetic" },
    { id: "q-linear", name: "Linear/quadratic equations", note: "Roots, identities and word models", group: "Algebra", priority: true },
    { id: "q-ineq", name: "Inequalities & modulus", note: "Intervals, signs and cases", group: "Algebra" },
    { id: "q-func", name: "Functions, logs & sequences", note: "Domain, transformations, AP and GP", group: "Algebra", priority: true },
    { id: "q-triangle", name: "Triangles & polygons", note: "Similarity, area ratios and angle facts", group: "Geometry", priority: true },
    { id: "q-circle", name: "Circles & mensuration", note: "Tangents, chords and 2D/3D measures", group: "Geometry" },
    { id: "q-coord", name: "Coordinate geometry", note: "Lines, distance, slopes and simple loci", group: "Geometry" },
    { id: "q-number", name: "Number systems", note: "Factors, divisibility, remainders and units digit", group: "Number systems" },
    { id: "q-pnc", name: "P&C and probability", note: "Count carefully; define the sample space", group: "Modern maths" },
    { id: "q-sets", name: "Set theory", note: "Two- and three-set counting", group: "Modern maths" },
  ],
};

const DEFAULT_PROFILE: Profile = { role: "Working professional", target: 99, weeklyHours: 15, confidence: { VARC: 3, DILR: 3, QA: 3 } };
const REVISION_INTERVALS = [2, 7, 21, 45];
const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const ROADMAP = [
  { dates: "12–31 AUG", title: "Audit + repair", tag: "NOW", body: "Take a diagnostic, close arithmetic/algebra gaps, and build a repeatable RC + DILR routine.", targets: ["1 full mock / week", "6–8 DILR sets / week", "8–10 RCs / week"] },
  { dates: "01–30 SEP", title: "Build mock rhythm", tag: "NEXT", body: "Shift from learning chapters to choosing questions, holding accuracy and spotting recurring leaks.", targets: ["1–2 full mocks / week", "2 sectionals / week", "Analyse within 24 hours"] },
  { dates: "01–31 OCT", title: "Exam conditioning", tag: "PEAK", body: "Run realistic simulations. Lock section strategy, attempts, checkpoints and exit rules.", targets: ["2 full mocks / week", "Past CAT papers as mocks", "Zero unanalysed tests"] },
  { dates: "01–28 NOV", title: "Sharpen + taper", tag: "FINISH", body: "Revise formulas and strategy notes, keep sleep steady and reduce volume in the final few days.", targets: ["2 mocks / week early", "No new sources", "Final mock 3–5 days out"] },
];

const MILESTONES = [
  { id: "notice", title: "Official notification", timing: "Released 25 Jul 2026", note: "IIM Indore is conducting CAT 2026" },
  { id: "register", title: "Registration submitted", timing: "OPEN · closes 15 Sep, 5 PM", note: "Opened 3 August at 10 AM on iimcat.ac.in" },
  { id: "correction", title: "Application correction checked", timing: "Date not announced", note: "Use the official correction window only if needed" },
  { id: "admit", title: "Admit card verified", timing: "From 4 Nov 2026", note: "Check slot, centre, photo and signature" },
  { id: "route", title: "Centre route rehearsed", timing: "Final week", note: "Plan arrival buffer and required documents" },
  { id: "kit", title: "Exam-day kit ready", timing: "Night before", note: "Printed admit card and permitted photo ID" },
  { id: "exam", title: "CAT 2026 examination", timing: "29 Nov 2026", note: "Computer-based test conducted in three sessions" },
];

const RESOURCES = [
  { title: "Official CAT website", use: "Only source for notification, registration, admit card and exam updates", href: "https://iimcat.ac.in/", label: "OFFICIAL" },
  { title: "Previous CAT papers", use: "Use real papers for calibration after topic practice", href: "https://online.2iim.com/CAT-question-paper/", label: "PYQs" },
  { title: "Cracku daily targets", use: "Free daily mixed practice and previous-paper questions", href: "https://cracku.in/cat-daily-target", label: "PRACTICE" },
  { title: "IMS CAT resources", use: "Syllabus guidance and one major mock-series option", href: "https://www.imsindia.com/cat/", label: "MOCKS" },
  { title: "T.I.M.E. CAT/MBA", use: "CAT preparation programmes and the AIMCAT mock-test series", href: "https://www.time4education.com/cat-Mba", label: "MOCKS" },
  { title: "Aeon Essays", use: "Long-form reading across philosophy, society, science and culture", href: "https://aeon.co/essays", label: "READING" },
];

const USE_BROWSER_STORAGE = process.env.NEXT_PUBLIC_CAT_STORAGE === "browser";

class StorageAuthError extends Error {}

async function throwStorageError(response: Response, fallback: string): Promise<never> {
  if (response.status === 401) throw new StorageAuthError("Owner sign-in required.");
  const body = await response.json().catch(() => null) as { error?: string } | null;
  throw new Error(body?.error || fallback);
}

async function loadStoredValue(key: string) {
  if (USE_BROWSER_STORAGE) return localStorage.getItem(key);
  const response = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { cache: "no-store" });
  if (!response.ok) await throwStorageError(response, "Persistent storage is unavailable.");
  const data = await response.json() as { value: string | null };
  return data.value;
}

async function saveStoredValue(key: string, value: string) {
  if (USE_BROWSER_STORAGE) {
    localStorage.setItem(key, value);
    return;
  }
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) await throwStorageError(response, "Persistent storage could not save your changes.");
}

function useLocalSet(key: string) {
  const [values, setValues] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    void loadStoredValue(key).then(value => {
      if (!cancelled) setValues(new Set(JSON.parse(value || "[]")));
    }).catch(() => { /* the main loader surfaces storage errors */ });
    return () => { cancelled = true; };
  }, [key]);
  const toggle = (id: string) => setValues(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id);
    void saveStoredValue(key, JSON.stringify([...next])); return next;
  });
  return [values, toggle] as const;
}

export function CatPlanner() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [revision, setRevision] = useState<Record<string, Revision>>({});
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("VARC");
  const [now, setNow] = useState(new Date());
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [showMockForm, setShowMockForm] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<Record<string, string[]>>({});
  const [weeklyPlan, setWeeklyPlan] = useState<string[]>([]);
  const [weeklyDone, setWeeklyDone] = useState<Set<string>>(new Set());
  const [weeklyReview, setWeeklyReview] = useState("");
  const [weekLoaded, setWeekLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [requiresOwnerLogin, setRequiresOwnerLogin] = useState(false);
  const [ownerLoginError, setOwnerLoginError] = useState("");
  const [milestones, toggleMilestone] = useLocalSet("cat26-milestones");

  function handleStorageFailure(error: unknown) {
    if (error instanceof StorageAuthError) {
      setRequiresOwnerLogin(true);
      setStorageError("Sign in to load your saved CAT progress.");
      return;
    }
    setStorageError(error instanceof Error ? error.message : "Persistent storage is unavailable.");
  }

  function persist(key: string, value: string) {
    void saveStoredValue(key, value).catch(handleStorageFailure);
  }

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadStoredValue("cat26-topics"), loadStoredValue("cat26-revision"), loadStoredValue("cat26-mocks"),
      loadStoredValue("cat26-daily-history"), loadStoredValue("cat26-profile"),
    ]).then(([topics, revisions, savedMocks, history, savedProfile]) => {
      if (cancelled) return;
      setCompleted(new Set(JSON.parse(topics || "[]")));
      setRevision(JSON.parse(revisions || "{}"));
      setMocks(JSON.parse(savedMocks || "[]"));
      setDailyHistory(JSON.parse(history || "{}"));
      if (savedProfile) setProfile(JSON.parse(savedProfile)); else setShowProfile(true);
    }).catch(error => {
      if (!cancelled) handleStorageFailure(error);
    }).finally(() => { if (!cancelled) setProfileLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  function dateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  const todayKey = dateKey(now);
  const todayAtNoon = new Date(`${todayKey}T12:00:00+05:30`);
  const monday = new Date(todayAtNoon.getTime() - ((todayAtNoon.getUTCDay() + 6) % 7) * 86400000);
  const weekKey = dateKey(monday);

  const weakestSections = useMemo(() => (["VARC", "DILR", "QA"] as SectionKey[]).sort((a, b) => profile.confidence[a] - profile.confidence[b]), [profile]);
  const dueRevisions = useMemo(() => Object.entries(revision)
    .filter(([, item]) => item.due <= now.getTime() && item.nextIndex < REVISION_INTERVALS.length)
    .map(([id, item]) => ({ topic: Object.values(TOPICS).flat().find(t => t.id === id), id, item }))
    .filter(item => item.topic), [revision, now]);

  const dailyTasks = useMemo(() => {
    const pick = (section: SectionKey) => TOPICS[section].find(t => t.priority && !completed.has(t.id)) || TOPICS[section].find(t => !completed.has(t.id));
    const weak = weakestSections[0];
    const weakTopic = pick(weak);
    const revisionTask = dueRevisions[0]?.topic;
    const focusMinutes = Math.max(45, Math.min(120, Math.round(profile.weeklyHours * 60 / 6)));
    return [
      { id: "focus", title: revisionTask ? `Revise: ${revisionTask.name}` : `Priority: ${weakTopic?.name || `${weak} strategy`}`, note: revisionTask ? "Scheduled retention check · mark it reviewed below when secure" : `${weak} is currently your lowest-confidence section` },
      { id: "varc", title: `VARC: ${pick("VARC")?.name || "section strategy"}`, note: "Timed attempt, then justify every option or sequence choice" },
      { id: "dilr", title: `DILR: ${pick("DILR")?.name || "set selection"}`, note: "Scan first, commit deliberately, and note the decisive constraint" },
      { id: "qa", title: `${focusMinutes}-min focused block`, note: `Prioritise ${weak}; finish by revisiting one previously mastered idea` },
    ];
  }, [completed, dueRevisions, profile, weakestSections]);

  useEffect(() => {
    let cancelled = false;
    setWeekLoaded(false);
    void loadStoredValue(`cat26-week-${weekKey}`).then(value => {
      if (cancelled) return;
      const saved = JSON.parse(value || "null");
      if (saved) {
        setWeeklyPlan(saved.plan || []); setWeeklyDone(new Set(saved.done || [])); setWeeklyReview(saved.review || "");
      } else {
        const weak = weakestSections[0];
        setWeeklyPlan([
          `${weak}: repair the highest-priority unfinished topic`, "VARC timed sectional + solution review", "DILR set-selection session",
          "QA mixed sectional + formula revision", `Second pass on ${weak}`, "Full mock under exact exam conditions", "Review the mock and plan the next week",
        ]);
        setWeeklyDone(new Set()); setWeeklyReview("");
      }
    }).catch(error => {
      if (!cancelled) { handleStorageFailure(error); setWeeklyPlan([]); setWeeklyDone(new Set()); setWeeklyReview(""); }
    }).finally(() => { if (!cancelled) setWeekLoaded(true); });
    return () => { cancelled = true; };
  }, [weekKey, weakestSections]);

  useEffect(() => {
    if (!weekLoaded) return;
    void saveStoredValue(`cat26-week-${weekKey}`, JSON.stringify({ plan: weeklyPlan, done: [...weeklyDone], review: weeklyReview })).catch(error => setStorageError(error instanceof Error ? error.message : "Storage is unavailable."));
  }, [weekKey, weekLoaded, weeklyDone, weeklyPlan, weeklyReview]);

  const days = Math.max(0, Math.ceil((EXAM_DATE.getTime() - now.getTime()) / 86400000));
  const totalTopics = Object.values(TOPICS).flat().length;
  const progress = Math.round((completed.size / totalTopics) * 100);
  const sectionDone = TOPICS[activeSection].filter(t => completed.has(t.id)).length;

  const todayLabel = useMemo(() => now.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  }), [now]);

  const dailyDone = new Set(dailyHistory[todayKey] || []);
  const streak = useMemo(() => {
    let count = 0;
    for (let offset = dailyDone.size === dailyTasks.length ? 0 : 1; offset < 366; offset++) {
      const key = dateKey(new Date(todayAtNoon.getTime() - offset * 86400000));
      if ((dailyHistory[key] || []).length < dailyTasks.length) break;
      count++;
    }
    return count;
  }, [dailyHistory, dailyDone.size, dailyTasks.length, todayAtNoon]);

  const mockStats = useMemo(() => {
    const totals = mocks.map(m => m.varc + m.dilr + m.qa);
    const latest = mocks.at(-1);
    return {
      average: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
      best: totals.length ? Math.max(...totals) : 0,
      latestPercentile: latest?.percentile,
      latestAccuracy: latest?.accuracy,
      max: Math.max(1, ...totals),
    };
  }, [mocks]);

  function toggleTopic(id: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setRevision(current => { const updated = { ...current }; delete updated[id]; persist("cat26-revision", JSON.stringify(updated)); return updated; });
      } else {
        next.add(id);
        setRevision(current => { const updated = { ...current, [id]: { nextIndex: 0, due: Date.now() + REVISION_INTERVALS[0] * 86400000 } }; persist("cat26-revision", JSON.stringify(updated)); return updated; });
      }
      persist("cat26-topics", JSON.stringify([...next]));
      return next;
    });
  }

  function markReviewed(id: string) {
    setRevision(current => {
      const item = current[id]; if (!item) return current;
      const nextIndex = item.nextIndex + 1;
      const updated = { ...current, [id]: { nextIndex, due: nextIndex < REVISION_INTERVALS.length ? Date.now() + REVISION_INTERVALS[nextIndex] * 86400000 : Number.MAX_SAFE_INTEGER } };
      persist("cat26-revision", JSON.stringify(updated)); return updated;
    });
  }

  function toggleDaily(id: string) {
    setDailyHistory(prev => {
      const set = new Set(prev[todayKey] || []); set.has(id) ? set.delete(id) : set.add(id);
      const next = { ...prev, [todayKey]: [...set] }; persist("cat26-daily-history", JSON.stringify(next)); return next;
    });
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const next: Profile = { role: String(data.get("role")), target: Number(data.get("target")), weeklyHours: Number(data.get("hours")), confidence: { VARC: Number(data.get("VARC")), DILR: Number(data.get("DILR")), QA: Number(data.get("QA")) } };
    setProfile(next); persist("cat26-profile", JSON.stringify(next)); setShowProfile(false);
  }

  async function signInToStorage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOwnerLoginError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setOwnerLoginError(body?.error || "Could not sign in.");
      return;
    }
    window.location.reload();
  }

  function addMock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Mock = {
      id: Date.now(), date: String(data.get("date")), name: String(data.get("name")) || `Mock ${mocks.length + 1}`,
      varc: Number(data.get("varc")), dilr: Number(data.get("dilr")), qa: Number(data.get("qa")), percentile: Number(data.get("percentile")) || undefined, accuracy: Number(data.get("accuracy")) || undefined, lesson: String(data.get("lesson")),
    };
    const updated = [...mocks, next]; setMocks(updated); persist("cat26-mocks", JSON.stringify(updated));
    setShowMockForm(false); event.currentTarget.reset();
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CAT 2026 Control Room home"><span>C</span> CAT // 26</a>
        <nav aria-label="Main navigation">
          <a href="#today">Today</a><a href="#week">Week</a><a href="#syllabus">Syllabus</a><a href="#mocks">Mocks</a><a href="#milestones">Milestones</a>
        </nav>
        <div className="top-actions"><a className="pill-link" href="/admissions">Admissions ↗</a><button className="pill-link" onClick={() => setShowProfile(true)}>My setup ↗</button></div>
      </header>
      <div className={`storage-banner ${storageError ? "error" : ""}`}>
        <span>{storageError || (USE_BROWSER_STORAGE ? "Browser storage mode" : "Persistent Redis storage")}</span>
        {!storageError && !USE_BROWSER_STORAGE && <small>Your progress is saved across deployments and cold starts.</small>}
      </div>

      {requiresOwnerLogin && <div className="profile-backdrop" role="presentation">
        <form className="profile-panel storage-login" onSubmit={signInToStorage}>
          <div><span className="kicker">OWNER ACCESS</span><h2>Unlock your control room</h2></div>
          <p>Your preparation data is private. Enter the owner password configured in Vercel.</p>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          {ownerLoginError && <p className="login-error" role="alert">{ownerLoginError}</p>}
          <button className="primary-btn" type="submit">Unlock progress</button>
        </form>
      </div>}

      {showProfile && profileLoaded && <div className="profile-backdrop" role="presentation" onMouseDown={() => setShowProfile(false)}>
        <form className="profile-panel" onSubmit={saveProfile} onMouseDown={event => event.stopPropagation()}>
          <div className="profile-title"><div><span className="kicker">PERSONALISE THE PLAN</span><h2>Your CAT setup</h2></div><button type="button" onClick={() => setShowProfile(false)} aria-label="Close setup">×</button></div>
          <div className="profile-grid">
            <label>Current routine<select name="role" defaultValue={profile.role}><option>Working professional</option><option>College student</option><option>Full-time preparation</option></select></label>
            <label>Target percentile<input name="target" type="number" min="80" max="100" step="0.1" defaultValue={profile.target} /></label>
            <label>Hours available / week<input name="hours" type="number" min="3" max="70" defaultValue={profile.weeklyHours} /></label>
          </div>
          <p className="confidence-label">CURRENT CONFIDENCE · 1 = NEEDS WORK, 5 = STRONG</p>
          <div className="confidence-grid">{(["VARC", "DILR", "QA"] as SectionKey[]).map(section => <label key={section}><b>{section}</b><input name={section} type="range" min="1" max="5" defaultValue={profile.confidence[section]} /><span>1 — 5</span></label>)}</div>
          <button className="primary-btn" type="submit">Update my plan</button>
        </form>
      </div>}

      <section className="hero" id="top">
        <div className="eyebrow"><span className="live-dot" /> CAT 2026 PREP CONTROL ROOM</div>
        <div className="hero-grid">
          <div>
            <h1>Show up.<br /><em>Track it.</em><br />Get better.</h1>
            <p className="hero-copy">One honest dashboard for the work between you and CAT day. No motivational fog. Just topics, reps, mocks and the next move.</p>
          </div>
          <div className="count-card">
            <div className="count-label">OFFICIAL TEST DAY</div>
            <div className="count-number">{days}</div>
            <div className="count-unit">DAYS TO GO</div>
            <div className="date-row"><strong>29 NOV 2026</strong><span>SUNDAY · CONFIRMED</span></div>
            <p>IIM Indore has confirmed CAT 2026 for 29 November. Registration is open until 15 September at 5:00 PM; admit cards become available on 4 November.</p>
          </div>
        </div>
        <div className="progress-strip">
          <span>SYLLABUS COVERAGE</span><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong><small>{completed.size}/{totalTopics} topics</small>
        </div>
      </section>

      <section className="section today-section" id="today">
        <div className="section-heading"><div><span className="kicker">01 // EXECUTE</span><h2>Your next moves</h2></div><p>{todayLabel}<br /><span>{streak} day streak · resets automatically at midnight IST</span></p></div>
        <div className="personal-line"><span>{profile.role}</span><span>Target {profile.target}%ile</span><span>{profile.weeklyHours} hrs/week</span><button onClick={() => setShowProfile(true)}>Adjust setup</button></div>
        <div className="daily-grid">
          {dailyTasks.map((task, index) => {
            const checked = dailyDone.has(task.id);
            return <button key={task.id} className={`daily-card ${checked ? "done" : ""}`} onClick={() => toggleDaily(task.id)} aria-pressed={checked}>
              <span className="daily-index">0{index + 1}</span><span className="check">{checked ? "✓" : ""}</span><strong>{task.title}</strong><small>{task.note}</small>
            </button>;
          })}
        </div>
        <div className="reset-note">Recommendations respond to your confidence, unfinished priority topics and scheduled revision.</div>
      </section>

      <section className="section week-section" id="week">
        <div className="section-heading"><div><span className="kicker">02 // PLAN</span><h2>This week</h2></div><p>Week of {new Date(`${weekKey}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}<br /><span>{weeklyDone.size}/7 planned days completed</span></p></div>
        <div className="week-board">{DAY_NAMES.map((day, index) => {
          const done = weeklyDone.has(String(index));
          return <article className={`week-day ${done ? "done" : ""}`} key={day}><button className="week-check" onClick={() => setWeeklyDone(prev => { const next = new Set(prev); next.has(String(index)) ? next.delete(String(index)) : next.add(String(index)); return next; })}>{done ? "✓" : day}</button><textarea aria-label={`${day} plan`} value={weeklyPlan[index] || ""} onChange={event => setWeeklyPlan(prev => { const next = [...prev]; next[index] = event.target.value; return next; })} /></article>;
        })}</div>
        <div className="weekly-review"><div><span className="kicker">SUNDAY REVIEW</span><h3>What worked—and what changes next week?</h3></div><textarea value={weeklyReview} onChange={event => setWeeklyReview(event.target.value)} placeholder="Keep this short: one win, one friction point, one adjustment." /></div>
      </section>

      <section className="section syllabus-section" id="syllabus">
        <div className="section-heading inverse"><div><span className="kicker">03 // MASTER</span><h2>The topic map</h2></div><p>Past-paper based, not an official syllabus.<br /><span>Completing a topic starts its 2–7–21–45 day revision cycle.</span></p></div>
        <div className="tabs" role="tablist" aria-label="CAT sections">
          {(Object.keys(TOPICS) as SectionKey[]).map(section => {
            const done = TOPICS[section].filter(t => completed.has(t.id)).length;
            return <button role="tab" aria-selected={activeSection === section} className={activeSection === section ? "active" : ""} key={section} onClick={() => setActiveSection(section)}><b>{section}</b><span>{done}/{TOPICS[section].length} complete</span></button>;
          })}
        </div>
        <div className="topic-meta"><span>{activeSection === "VARC" ? "Verbal Ability & Reading Comprehension" : activeSection === "DILR" ? "Data Interpretation & Logical Reasoning" : "Quantitative Ability"}</span><strong>{Math.round(sectionDone / TOPICS[activeSection].length * 100)}%</strong></div>
        <div className="topic-list">
          {TOPICS[activeSection].map((topic, index) => {
            const checked = completed.has(topic.id);
            return <button key={topic.id} className={`topic-row ${checked ? "done" : ""}`} onClick={() => toggleTopic(topic.id)} aria-pressed={checked}>
              <span className="topic-num">{String(index + 1).padStart(2, "0")}</span><span className="topic-copy"><b>{topic.name}{topic.priority && <i>HIGH RETURN</i>}</b><small>{topic.group} · {topic.note}</small></span><span className="topic-check">{checked ? "✓" : "+"}</span>
            </button>;
          })}
        </div>
        <div className="revision-box">
          <div><span className="kicker">REVISION QUEUE</span><h3>{dueRevisions.length ? `${dueRevisions.length} due now` : "Nothing due today"}</h3><p>Mastered topics return after 2, 7, 21 and 45 days.</p></div>
          <div className="revision-items">{dueRevisions.length ? dueRevisions.slice(0, 5).map(item => <button key={item.id} onClick={() => markReviewed(item.id)}><span>{item.topic?.name}</span><b>Mark reviewed ✓</b></button>) : <span className="queue-clear">Your queue is clear. Finish a topic to start its cycle.</span>}</div>
        </div>
      </section>

      <section className="section" id="roadmap">
        <div className="section-heading"><div><span className="kicker">04 // SEQUENCE</span><h2>Road to test day</h2></div><p>Built for the final 109-day stretch.<br /><span>Protect analysis time before adding more mocks.</span></p></div>
        <div className="roadmap">
          {ROADMAP.map((phase, index) => <article className="phase" key={phase.title}>
            <div className="phase-rail"><span>0{index + 1}</span><i /></div>
            <div className="phase-content"><div className="phase-top"><span>{phase.dates}</span><b>{phase.tag}</b></div><h3>{phase.title}</h3><p>{phase.body}</p><ul>{phase.targets.map(t => <li key={t}>{t}</li>)}</ul></div>
          </article>)}
        </div>
      </section>

      <section className="section mock-section" id="mocks">
        <div className="section-heading inverse"><div><span className="kicker">05 // DIAGNOSE</span><h2>Mock lab</h2></div><button className="primary-btn" onClick={() => setShowMockForm(v => !v)}>{showMockForm ? "Close" : "+ Log a mock"}</button></div>
        {showMockForm && <form className="mock-form" onSubmit={addMock}>
          <label>Test name<input name="name" placeholder="e.g. SIMCAT 04" required /></label>
          <label>Date<input name="date" type="date" defaultValue={now.toISOString().slice(0, 10)} required /></label>
          <label>VARC score<input name="varc" type="number" defaultValue="0" required /></label>
          <label>DILR score<input name="dilr" type="number" defaultValue="0" required /></label>
          <label>QA score<input name="qa" type="number" defaultValue="0" required /></label>
          <label>Percentile<input name="percentile" type="number" min="0" max="100" step="0.01" placeholder="Optional" /></label>
          <label>Accuracy %<input name="accuracy" type="number" min="0" max="100" placeholder="Optional" /></label>
          <label className="lesson-field">One lesson<input name="lesson" placeholder="What changes in the next mock?" required /></label>
          <button className="primary-btn" type="submit">Save mock</button>
        </form>}
        {mocks.length ? <>
          <div className="mock-summary"><div><span>ROLLING AVERAGE</span><b>{mockStats.average}</b></div><div><span>BEST TOTAL</span><b>{mockStats.best}</b></div><div><span>LATEST %ILE</span><b>{mockStats.latestPercentile ?? "—"}</b></div><div><span>LATEST ACCURACY</span><b>{mockStats.latestAccuracy ? `${mockStats.latestAccuracy}%` : "—"}</b></div></div>
          <div className="trend-chart" aria-label="Mock total score trend">{mocks.slice(-10).map(mock => { const total = mock.varc + mock.dilr + mock.qa; return <div className="trend-item" key={mock.id} title={`${mock.name}: ${total}`}><b>{total}</b><i style={{ height: `${Math.max(8, total / mockStats.max * 100)}%` }} /><span>{mock.name.slice(0, 8)}</span></div>; })}</div>
          <div className="mock-table"><div className="mock-head"><span>TEST</span><span>VARC</span><span>DILR</span><span>QA</span><span>TOTAL</span><span>NEXT-MOCK RULE</span></div>
          {[...mocks].reverse().map(mock => <div className="mock-row" key={mock.id}><span><b>{mock.name}</b><small>{mock.date}{mock.percentile ? ` · ${mock.percentile}%ile` : ""}</small></span><span>{mock.varc}</span><span>{mock.dilr}</span><span>{mock.qa}</span><span className="total">{mock.varc + mock.dilr + mock.qa}</span><span>{mock.lesson}</span></div>)}</div>
        </> : <div className="empty-mocks"><span>NO DATA YET</span><h3>Your first mock is a baseline,<br />not a verdict.</h3><p>Log section scores and one behaviour to change. Percentile matters; the lesson matters more.</p></div>}
        <div className="analysis-loop"><b>THE 24-HOUR LOOP</b><span>01 Sit the mock</span><i>→</i><span>02 Redo missed questions</span><i>→</i><span>03 Review selection</span><i>→</i><span>04 Set one next-mock rule</span></div>
      </section>

      <section className="section milestones-section" id="milestones">
        <div className="section-heading"><div><span className="kicker">06 // ARRIVE READY</span><h2>Official milestones</h2></div><p>CAT 2026 schedule released by IIM Indore.<br /><span>Use iimcat.ac.in as the source of truth.</span></p></div>
        <div className="official-notice">
          <div><span>REGISTRATION STATUS</span><strong>OPEN NOW</strong></div>
          <div><span>APPLICATION WINDOW</span><strong>03 AUG, 10 AM → 15 SEP, 5 PM</strong></div>
          <div><span>REGISTRATION FEE</span><strong>₹2,700 · ₹1,350 FOR SC/ST/PwD</strong></div>
          <a href="https://iimcat.ac.in/" target="_blank" rel="noreferrer">OPEN OFFICIAL PORTAL ↗</a>
        </div>
        <div className="milestone-list">{MILESTONES.map((item, index) => { const done = milestones.has(item.id); return <button key={item.id} onClick={() => toggleMilestone(item.id)} className={done ? "done" : ""}><span className="milestone-num">0{index + 1}</span><span><b>{item.title}</b><small>{item.note}</small></span><em>{item.timing}</em><i>{done ? "✓" : "+"}</i></button>; })}</div>
      </section>

      <section className="section sources-section" id="sources">
        <div className="section-heading"><div><span className="kicker">07 // CURATE</span><h2>Your lean study stack</h2></div><p>One source per job. Fewer tabs, deeper work.<br /><span>Paid products are options, not endorsements.</span></p></div>
        <div className="resource-grid">
          {RESOURCES.map(resource => <a href={resource.href} target="_blank" rel="noreferrer" key={resource.title}><span>{resource.label}</span><h3>{resource.title} ↗</h3><p>{resource.use}</p></a>)}
        </div>
        <div className="exam-checklist">
          <div><span className="kicker">ADMIN CHECKPOINTS</span><h3>Don’t let logistics undo the prep.</h3></div>
          <ul><li>Complete registration before 15 September, 5:00 PM</li><li>Recheck name, category, marks and uploaded documents before submission</li><li>Download and verify the admit card from 4 November</li><li>Visit the centre route and prepare ID + printed admit card</li><li>Match sleep, food and mock timing to your allotted slot</li></ul>
        </div>
      </section>

      <footer><div className="brand"><span>C</span> CAT // 26</div><p>Consistency is a strategy.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
