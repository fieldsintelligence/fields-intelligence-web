export type ContactPayload = {
  name: string;
  email: string;
  organization: string;
  role: string;
  message: string;
  website?: string;
};

export type ContactErrors = Partial<Record<keyof ContactPayload, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: ContactPayload): ContactErrors {
  const errors: ContactErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const organization = input.organization.trim();
  const message = input.message.trim();

  if (name.length < 2) errors.name = "Please include your name.";
  if (!EMAIL.test(email)) errors.email = "Use a valid work email.";
  if (organization.length < 2) errors.organization = "Which organization?";
  if (message.length < 20) {
    errors.message = "Add a bit more context (at least a couple of sentences).";
  }
  if (message.length > 4000) errors.message = "Please keep this under 4,000 characters.";

  return errors;
}

export const roleOptions = [
  { value: "", label: "Role (optional)" },
  { value: "executive", label: "Executive" },
  { value: "credit", label: "Credit / credit admin" },
  { value: "audit", label: "Audit / review" },
  { value: "lending", label: "Lending / loan operations" },
  { value: "other", label: "Other" },
] as const;
