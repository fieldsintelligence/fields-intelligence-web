"use client";

import { useState } from "react";

type UseCase = {
  id: string;
  title: string;
  oneLiner: string;
  mockLabel: string;
  org: string;
  boundary: string;
  items: string[];
  footerChip: string;
  crossedLane: string;
  crossedNote: string;
};

const cases: UseCase[] = [
  {
    id: "banking",
    title: "Banking",
    oneLiner:
      "Credit files, exam prep, and loan ops without shipping customer data to a public model.",
    mockLabel: "Inside the bank",
    org: "Ozark Community Bank (example)",
    boundary: "Trust boundary · you hold the keys",
    items: [
      "Credit file → Auditlane review",
      "Human sign-off",
      "Immutable log · in-perimeter",
    ],
    footerChip: "Data stays here",
    crossedLane: "Public model vendors",
    crossedNote: "No customer file to the public internet",
  },
  {
    id: "legal",
    title: "Legal",
    oneLiner:
      "Matter files and discovery assistance that never leave the firm’s wall.",
    mockLabel: "Inside the firm",
    org: "Rivers & Hale LLP (example)",
    boundary: "Client confidences stay counsel-side",
    items: [
      "Matter file → Privilege screen",
      "Partner sign-off",
      "Work product · in-perimeter",
    ],
    footerChip: "Work product stays here",
    crossedLane: "Public AI tools",
    crossedNote: "No client file off-prem",
  },
  {
    id: "healthcare",
    title: "Healthcare",
    oneLiner:
      "Chart-aware agents for ops and documentation—without PHI riding to a public endpoint.",
    mockLabel: "Inside the system",
    org: "Hill County Health (example)",
    boundary: "PHI residency · covered entity controls access",
    items: [
      "Encounter note → Coding assist",
      "Clinician sign-off",
      "Chart trail · in-perimeter",
    ],
    footerChip: "PHI stays here",
    crossedLane: "Public model vendors",
    crossedNote: "No chart to the public internet",
  },
  {
    id: "insurance",
    title: "Insurance",
    oneLiner:
      "Claims and underwriting support on files that are contractually and regulatorily sensitive.",
    mockLabel: "Inside the carrier",
    org: "Prairie Mutual (example)",
    boundary: "Claim file custody · you hold the keys",
    items: [
      "FNOL packet → Coverage check",
      "Adjuster sign-off",
      "Claim trail · in-perimeter",
    ],
    footerChip: "Claim data stays here",
    crossedLane: "Public AI tools",
    crossedNote: "No claim file out the door",
  },
];

export function UseCases() {
  const [activeId, setActiveId] = useState(cases[0].id);
  const active = cases.find((c) => c.id === activeId) ?? cases[0];

  return (
    <section
      id="use-cases"
      className="section-anchor border-b border-line bg-cream"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-navy">Where it fits</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight text-navy sm:text-4xl">
          Built for work that can’t go public.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Same sovereign pattern. Different files. Here’s how Fields shows up
          across industries that live on NPI.
        </p>

        <div
          className="mt-10 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Industry use cases"
        >
          {cases.map((item) => {
            const selected = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`use-case-panel-${item.id}`}
                id={`use-case-tab-${item.id}`}
                onClick={() => setActiveId(item.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-brass/40 bg-navy text-chalk"
                    : "border-line bg-chalk text-navy hover:border-navy/25"
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        <div
          id={`use-case-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`use-case-tab-${active.id}`}
          className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start"
        >
          <div>
            <h3 className="text-2xl font-medium tracking-tight text-navy">
              {active.title}
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-slate">
              {active.oneLiner}
            </p>
          </div>

          <aside
            className="rounded-xl border border-line bg-chalk p-4 sm:p-5"
            aria-label={`${active.title} trust boundary mock`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
              {active.mockLabel}
            </p>
            <div className="mt-3 rounded-lg border border-dashed border-navy/35 bg-paper p-4">
              <p className="text-sm font-medium text-navy">{active.org}</p>
              <p className="text-xs text-slate">{active.boundary}</p>
              <ul className="mt-4 space-y-2">
                {active.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-lg border border-line bg-chalk px-3 py-2 text-sm text-navy"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg border border-brass/40 bg-navy px-3 py-2 text-center text-sm font-medium text-chalk">
                {active.footerChip}
              </p>
            </div>
            <div className="relative mt-3 rounded-lg border border-line bg-paper px-4 py-3">
              <div
                aria-hidden="true"
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-paper px-2 text-[11px] font-medium tracking-wide text-slate"
              >
                does not cross
              </div>
              <p className="pt-1 text-center text-sm text-slate line-through decoration-slate/50">
                {active.crossedLane}
              </p>
              <p className="mt-1 text-center text-xs text-navy">
                {active.crossedNote}
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-8 text-sm text-slate">
          Banking remains our deepest wedge today. The architecture is the same
          wherever NPI can’t travel.
        </p>
      </div>
    </section>
  );
}
