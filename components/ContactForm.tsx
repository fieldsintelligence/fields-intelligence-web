"use client";

import { useState, type FormEvent } from "react";
import {
  roleOptions,
  validateContact,
  type ContactErrors,
  type ContactPayload,
} from "@/lib/contact";
import { site } from "@/lib/site";

const empty: ContactPayload = {
  name: "",
  email: "",
  organization: "",
  role: "",
  message: "",
  website: "",
};

export function ContactForm() {
  const [values, setValues] = useState<ContactPayload>(empty);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [serverMessage, setServerMessage] = useState("");

  const update = (field: keyof ContactPayload, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateContact(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    setServerMessage("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setServerMessage(data.error ?? "Something went wrong. Email us instead.");
        return;
      }
      setStatus("success");
      setValues(empty);
    } catch {
      setStatus("error");
      setServerMessage("Network error. You can still email us directly.");
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-brass/40 bg-cream px-6 py-8"
      >
        <h2 className="text-2xl font-medium text-navy">Got it.</h2>
        <p className="mt-3 text-slate">
          Thanks — we’ll read it. If it’s a fit, you’ll hear from Zak. You can
          also write{" "}
          <a
            className="font-medium text-navy underline underline-offset-4"
            href={`mailto:${site.email}`}
          >
            {site.email}
          </a>{" "}
          if you want to add a file list or a preferred time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </div>

      <Field
        id="name"
        label="Name"
        value={values.name}
        error={errors.name}
        autoComplete="name"
        onChange={(value) => update("name", value)}
      />
      <Field
        id="email"
        label="Work email"
        type="email"
        value={values.email}
        error={errors.email}
        autoComplete="email"
        onChange={(value) => update("email", value)}
      />
      <Field
        id="organization"
        label="Bank or organization"
        value={values.organization}
        error={errors.organization}
        autoComplete="organization"
        onChange={(value) => update("organization", value)}
      />

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-navy">
          Role
        </label>
        <select
          id="role"
          name="role"
          value={values.role}
          onChange={(event) => update("role", event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-navy"
        >
          {roleOptions.map((option) => (
            <option key={option.value || "none"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-navy">
          What do you want to try in a pilot?
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-navy"
          placeholder="A few sentences on the shop, the files, and why they can’t leave."
        />
        {errors.message ? (
          <p id="message-error" className="mt-1.5 text-sm text-red-800">
            {errors.message}
          </p>
        ) : null}
      </div>

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-800">
          {serverMessage}{" "}
          <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
            {site.email}
          </a>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-full items-center justify-center rounded-lg border border-brass/40 bg-navy px-5 py-3 text-base font-medium text-chalk hover:bg-ink disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-navy"
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
