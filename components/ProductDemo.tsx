"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Severity = "exception" | "document" | "policy";

type Finding = {
  severity: Severity;
  title: string;
  detail: string;
};

type DemoFile = {
  id: string;
  borrower: string;
  product: string;
  amount: string;
  officer: string;
  findings: Finding[];
};

const FILES: DemoFile[] = [
  {
    id: "oakridge",
    borrower: "Oakridge Manufacturing, Inc.",
    product: "C&I renewal",
    amount: "$2.40M",
    officer: "M. Ellison",
    findings: [
      {
        severity: "exception",
        title: "DSCR below policy floor",
        detail:
          "Trailing DSCR 1.15 against a 1.25 policy floor. Two quarters of margin compression on the industrial line.",
      },
      {
        severity: "document",
        title: "2024 business tax return not in file",
        detail:
          "Return marked “to follow” since 12 Mar. Guarantor personal returns are present.",
      },
      {
        severity: "policy",
        title: "Continuing guarantee incomplete",
        detail: "Page 3 unsigned. Pages 1–2 executed 4 Feb.",
      },
    ],
  },
  {
    id: "hartwell",
    borrower: "Hartwell Farms LLC",
    product: "Ag operating line",
    amount: "$850K",
    officer: "R. Benally",
    findings: [
      {
        severity: "exception",
        title: "Working-capital swing vs. projections",
        detail:
          "YTD cash conversion is 38 days slower than the commitment memo. Input costs rose; cattle receipts lagged.",
      },
      {
        severity: "document",
        title: "Crop insurance declarations stale",
        detail: "Declarations on file are prior-season. Current-year schedule not attached.",
      },
      {
        severity: "policy",
        title: "Related-party lease not fully disclosed",
        detail:
          "Equipment lease with a sibling entity appears in the tax return, not in the credit write-up.",
      },
    ],
  },
  {
    id: "maple",
    borrower: "Maple Street Properties",
    product: "CRE refinance",
    amount: "$1.10M",
    officer: "J. Hale",
    findings: [
      {
        severity: "exception",
        title: "Vacancy vs. appraisal assumption",
        detail:
          "Rent roll shows 18% vacancy; appraisal underwrote 8%. Debt yield still clears, barely.",
      },
      {
        severity: "document",
        title: "Environmental questionnaire incomplete",
        detail: "Prior use as a dry cleaner noted in 2011 file; current questionnaire skips that block.",
      },
      {
        severity: "policy",
        title: "Guarantor liquidity below guideline",
        detail:
          "Personal liquidity $142K against a $250K guideline for this CRE bucket. Compensating: global cash flow.",
      },
    ],
  },
];

const STEPS = [
  "Opening credit file inside the bank perimeter",
  "Reading policy overlay — no egress",
  "Drafting exceptions for human review",
];

type Phase = "idle" | "running" | "review" | "signed";

const severityLabel: Record<Severity, string> = {
  exception: "Exception",
  document: "Document",
  policy: "Policy",
};

function hashFor(fileId: string) {
  const raw = `auditlane:${fileId}:signed`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function ProductDemo() {
  const statusId = useId();
  const [fileId, setFileId] = useState(FILES[0].id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [signedOff, setSignedOff] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  const file = useMemo(
    () => FILES.find((item) => item.id === fileId) ?? FILES[0],
    [fileId],
  );

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const resetForFile = (nextId: string) => {
    clearTimers();
    setFileId(nextId);
    setPhase("idle");
    setStepIndex(0);
    setSignedOff(false);
    setLog([]);
  };

  const runReview = () => {
    clearTimers();
    setSignedOff(false);
    setPhase("running");
    setStepIndex(0);
    setLog([
      `${stamp()}  File opened  ·  ${file.borrower}  ·  residency: bank perimeter`,
    ]);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced ? 0 : 850;

    STEPS.forEach((_, index) => {
      const id = window.setTimeout(() => {
        setStepIndex(index);
        if (index === 1) {
          setLog((rows) => [
            ...rows,
            `${stamp()}  Model run  ·  local  ·  egress events: 0`,
          ]);
        }
        if (index === STEPS.length - 1) {
          const done = window.setTimeout(() => {
            setPhase("review");
            setLog((rows) => [
              ...rows,
              `${stamp()}  ${file.findings.length} findings drafted  ·  awaiting human sign-off`,
            ]);
          }, wait);
          timers.current.push(done);
        }
      }, wait * index);
      timers.current.push(id);
    });
  };

  const commitLog = () => {
    if (!signedOff || phase !== "review") return;
    const digest = hashFor(file.id);
    setPhase("signed");
    setLog((rows) => [
      ...rows,
      `${stamp()}  Signed  ·  J. Hale, Credit Review  ·  log hash ${digest}…e21a`,
    ]);
  };

  const statusText =
    phase === "idle"
      ? "Ready. Choose a file and run a review — nothing leaves the perimeter."
      : phase === "running"
        ? STEPS[stepIndex]
        : phase === "review"
          ? "Findings ready. A person still has to sign."
          : "Review committed to the in-bank log. Still no egress.";

  return (
    <section id="demo" className="section-anchor border-b border-line bg-navy text-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-cream/70">Product demo</p>
            <h2 className="mt-2 text-3xl font-medium tracking-tight text-white sm:text-4xl">
              Auditlane on a credit file — without the file leaving the building.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-cream/75">
              A prototype walkthrough, not a live bank integration. Synthetic
              names, synthetic numbers. The point is the boundary: review
              happens in-perimeter, a human signs, the log stays.
            </p>
          </div>
          <p className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-cream/80">
            Prototype · mock data
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-white/10 bg-ink">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="font-medium text-white">Auditlane</span>
              <span className="hidden text-cream/45 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="text-sm text-cream/70">Ozark Community Bank</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brass opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brass" />
              </span>
              <span className="font-medium tracking-wide text-brass">
                IN PERIMETER
              </span>
              <span className="text-cream/40">· egress 0</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(16rem,0.38fr)_minmax(0,1fr)]">
            <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/50">
                Credit files
              </p>
              <ul className="mt-3 space-y-2" role="listbox" aria-label="Demo credit files">
                {FILES.map((item) => {
                  const selected = item.id === fileId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => resetForFile(item.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          selected
                            ? "border-brass/50 bg-white/10 text-white"
                            : "border-white/10 bg-transparent text-cream/80 hover:border-white/25"
                        }`}
                      >
                        <span className="block text-sm font-medium">{item.borrower}</span>
                        <span className="mt-1 block text-xs text-cream/55">
                          {item.product} · {item.amount}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={runReview}
                  className="rounded-lg border border-brass/40 bg-navy px-3 py-2.5 text-sm font-medium text-chalk hover:bg-[#16324a]"
                >
                  Run Auditlane review
                </button>
                <button
                  type="button"
                  onClick={() => resetForFile(file.id)}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm text-cream/80 hover:bg-white/5"
                >
                  Reset demo
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-white">{file.borrower}</p>
                  <p className="text-sm text-cream/60">
                    {file.product} · {file.amount} · officer {file.officer}
                  </p>
                </div>
                <p
                  id={statusId}
                  role="status"
                  aria-live="polite"
                  className="max-w-sm text-sm text-brass"
                >
                  {statusText}
                </p>
              </div>

              {phase === "idle" ? (
                <div className="mt-8 rounded-lg border border-dashed border-white/15 px-4 py-10 text-center text-cream/55">
                  Run the review to watch findings draft inside the perimeter.
                  Public model vendors are not in this picture.
                </div>
              ) : null}

              {phase === "running" ? (
                <ol className="mt-8 space-y-3">
                  {STEPS.map((step, index) => (
                    <li
                      key={step}
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        index <= stepIndex
                          ? "border-brass/40 bg-brass/10 text-white"
                          : "border-white/10 text-cream/40"
                      }`}
                    >
                      {index <= stepIndex ? "●" : "○"} {step}
                    </li>
                  ))}
                </ol>
              ) : null}

              {phase === "review" || phase === "signed" ? (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/50">
                    Draft findings
                  </p>
                  <ul className="mt-3 space-y-3">
                    {file.findings.map((finding) => (
                      <li
                        key={finding.title}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium tracking-wide text-cream/80">
                            {severityLabel[finding.severity]}
                          </span>
                          {finding.title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-cream/70">
                          {finding.detail}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-start gap-3 text-sm text-cream/90">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-brass"
                        checked={signedOff}
                        disabled={phase === "signed"}
                        onChange={(event) => setSignedOff(event.target.checked)}
                      />
                      <span>
                        I have reviewed these findings. Human sign-off is
                        required before the log is written.
                      </span>
                    </label>
                    {phase === "signed" ? (
                      <p className="shrink-0 rounded-lg border border-brass/40 px-3 py-2 text-sm font-medium text-brass">
                        Written to the log
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={commitLog}
                        disabled={!signedOff}
                        className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Commit to audit log
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {log.length > 0 ? (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/50">
                    Immutable log
                  </p>
                  <ol className="mt-2 space-y-1 font-mono text-[12px] leading-relaxed text-cream/65">
                    {log.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function stamp() {
  const now = new Date();
  return now.toISOString().slice(11, 19);
}
