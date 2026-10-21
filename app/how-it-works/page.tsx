import type { Metadata } from "next";
import { TrustBoundary } from "@/components/TrustBoundary";
import {
  ARCHITECTURE_DIAGRAM_ALT,
  ARCHITECTURE_DIAGRAM_HEIGHT,
  ARCHITECTURE_DIAGRAM_SRC,
  ARCHITECTURE_DIAGRAM_WIDTH,
} from "@/lib/architecture-diagram";

// Copy is verbatim from Marketing, approved by Zak (2026-10-21 9:25 AM CT).
// Do not reword it. The diagram is served byte-for-byte from public/; its src
// and alt text live in lib/architecture-diagram.ts, shared with the homepage teaser.

const DESCRIPTION =
  "Your files, your tools and the Fields Intelligence app all run on your own computers, behind your own sign-in rules.";

const BODY =
  "Your files, your tools and the Fields Intelligence app all run on your own computers, behind your own sign-in rules. When you ask a question, only that question and the bits of your files needed to answer it travel to our AI engine, encrypted both ways. The engine works in memory, answers, and forgets. We never write your prompts or answers to disk, and we don't log them.";

const DIAGRAM_SRC = ARCHITECTURE_DIAGRAM_SRC;

const DIAGRAM_ALT = ARCHITECTURE_DIAGRAM_ALT;

const LEGEND_HEADING = "What you're looking at";

const LEGEND: ReadonlyArray<readonly [term: string, description: string]> = [
  ["Your computer", "the computer you already use at work."],
  ["FI Harness", "the Fields Intelligence app that does the work for you. It runs on your systems, not ours."],
  ["Context store", "the files and notes the app is allowed to read. They're stored on your infrastructure."],
  ["AgentGateway", "the gatekeeper. Before any tool runs, it checks whether your role allows it."],
  ["Harness tools", "what the app can use to get work done: internet access (only as your policy allows), your databases, and everyday software utilities."],
  ["Audit and compliance logging", "a record of every action the app takes, kept on your systems for your examiners and auditors."],
  ["Acts only with the signed-in user's permissions", "the app can't do anything you aren't already allowed to do."],
  ["Organizational access controls (dashed line)", "your company's existing permission rules surround all of it."],
  ["SSO sign-in with 2FA", "you sign in with your work account plus a second check, like a code or security key."],
  ["TLS padlock", "the connection to our engine is encrypted in both directions."],
  ["Prompt / context (red arrow)", "your question, plus the pieces of your files needed to answer it."],
  ["Response / action (blue arrow)", "the answer, or a request to use a tool. The app carries out that request on your side, only after the gatekeeper checks it."],
  ["AI engine (LLM)", 'the "brain" that reads your request and writes the answer. It runs on Fields Intelligence servers at ai.fieldsintelligence.com.'],
  ["Amnesiac", "the engine holds your conversation in memory only and never writes it to disk."],
  ["Prompts and responses not logged", "we keep no record of what you asked or what it said."],
  ["No open-internet connectivity", "the engine can't reach out to the web on its own."],
];

export const metadata: Metadata = {
  title: { absolute: "How it works | Fields Intelligence" },
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How it works | Fields Intelligence",
    description: DESCRIPTION,
    url: "/how-it-works",
    type: "website",
  },
  twitter: {
    title: "How it works | Fields Intelligence",
    description: DESCRIPTION,
  },
};

export default function HowItWorksPage() {
  return (
    <div className="border-b border-line bg-chalk">
      <div className="mx-auto max-w-6xl px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brass">How it works</p>
          <h1 className="mt-3 font-serif text-4xl font-normal tracking-tight text-navy sm:text-5xl">
            Your data stays under your control.
          </h1>
          <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />
          <p className="mt-6 text-lg leading-relaxed text-slate">{BODY}</p>
        </div>

        <figure className="mt-12">
          {/* Plain <img> so the delivered bytes are the approved file, unre-encoded. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DIAGRAM_SRC}
            alt={DIAGRAM_ALT}
            width={ARCHITECTURE_DIAGRAM_WIDTH}
            height={ARCHITECTURE_DIAGRAM_HEIGHT}
            loading="eager"
            decoding="async"
            className="block h-auto w-full rounded-xl border border-line"
          />
        </figure>
      </div>

      {/* Text-box trust diagram, moved unchanged from the homepage (Zak, 10:04 AM CT 2026-10-21). */}
      <TrustBoundary />

      <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="pt-14 max-w-3xl">
          <h2 className="font-serif text-3xl font-normal tracking-tight text-navy">
            {LEGEND_HEADING}
          </h2>
          <div aria-hidden="true" className="mt-4 h-px w-16 bg-brass" />
          <dl className="mt-8 divide-y divide-line border-y border-line">
            {LEGEND.map(([term, description]) => (
              <div key={term} className="py-4 sm:grid sm:grid-cols-[16rem_1fr] sm:gap-6">
                <dt className="font-semibold text-navy">{term}</dt>
                <dd className="mt-1 leading-relaxed text-slate sm:mt-0">{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
