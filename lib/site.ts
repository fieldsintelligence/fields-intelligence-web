export const site = {
  name: "Fields",
  legalName: "Fields Intelligence LLC",
  domain: "fieldsintelligence.com",
  url: "https://fieldsintelligence.com",
  tagline: "Sovereign AI that never leaves the bank.",
  description:
    "Fields builds sovereign AI for regional banks — models and agents that stay inside the bank’s trust boundary.",
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
  { href: "/#products", label: "The work" },
  { href: "/#demo", label: "Demo" },
  { href: "/#sovereign", label: "How it stays in" },
  { href: "/#founder", label: "Founder" },
] as const;
