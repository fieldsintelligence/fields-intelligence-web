export const site = {
  name: "Fields",
  legalName: "Fields Intelligence LLC",
  domain: "fieldsintelligence.com",
  url: "https://fieldsintelligence.com",
  tagline: "Sovereign AI for NPI",
  description:
    "Sovereign AI for NPI from Fields: models and agents that stay inside your trust boundary for organizations handling Non-Public Information.",
  email: "hello@fieldsintelligence.com",
  founder: {
    shortName: "Zak Fields",
    legalName: "Zachary J. Fields",
    location: "Cassville, Missouri",
  },
  jurisdiction: "Missouri",
} as const;

export const nav = [
  { href: "/#problem", label: "The problem" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/#products", label: "The work" },
  { href: "/#demo", label: "Demo" },
  { href: "/#sovereign", label: "How it stays in" },
  { href: "/#founder", label: "Founder" },
] as const;
