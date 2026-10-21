export const site = {
  name: "Fields",
  legalName: "Fields Intelligence LLC",
  domain: "fieldsintelligence.com",
  url: "https://fieldsintelligence.com",
  blogHost: "blog.fieldsintelligence.com",
  blogUrl: "https://blog.fieldsintelligence.com",
  tagline: "Sovereign AI for NPI",
  description:
    "Sovereign AI for NPI from Fields Intelligence: agents that run inside your trust boundary, inference on Fields Intelligence infrastructure, and no prompt or response logs.",
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
  { href: `${site.url}/#sovereign`, label: "How it works" },
  { href: "/#founder", label: "Founder" },
  // Blog host index. Relative `/blog` 308s, and on the blog host `/` never leaves that subdomain.
  { href: `${site.blogUrl}/`, label: "Blog" },
] as const;
