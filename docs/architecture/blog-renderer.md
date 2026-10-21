# Blog renderer

Posts are markdown files in `content/blog/<slug>.md` with `title`, `date` (YYYY-MM-DD) and
`description` frontmatter. Parsing and rendering are separate:

- `lib/blog-parse.ts` turns the body into a typed block list. It is pure (no fs, no React).
- `lib/blog-images.ts` checks every image at build time: the src must match
  `^/blog/[a-z0-9-]+\.png$` or be in `ALLOWED_IMAGE_SRCS`, the file must exist under `public/`,
  and width and height come from the PNG IHDR header. Anything else throws, so `next build` fails.
- `lib/blog.ts` reads the files and wires the two together.
- `components/BlogArticle.tsx` only maps blocks to JSX, with an exhaustive `switch` whose
  `never` default makes a new block type a compile error.

Images are plain `<img>` with width and height, never `next/image`, so the served bytes are
the committed bytes. HTML comments are stripped; any other tag-like text renders as literal,
React-escaped text. There is no `dangerouslySetInnerHTML` in the blog path.

| Markdown | Block |
| --- | --- |
| `## Heading` | `Heading2` |
| `- item` lines | `BulletList` |
| `1. item` lines | `OrderedList` |
| `![alt](/blog/x.png)` | `Figure` |
| `*caption*` directly under an image line | `Figure.caption` (`CaptionInline[]`, see below) |
| anything else | `Paragraph` (inline `**bold**`, `*em*`, `[text](https://…)`, bare `https://…`) |

```mermaid
classDiagram
  direction LR
  class Block {
    <<union>>
    kind
  }
  class Paragraph {
    kind: "paragraph"
    text: InlineNode[]
  }
  class Heading2 {
    kind: "heading2"
    text: string
  }
  class BulletList {
    kind: "bulletList"
    items: InlineNode[][]
  }
  class OrderedList {
    kind: "orderedList"
    items: InlineNode[][]
  }
  class Figure {
    kind: "figure"
    src: string
    alt: string
    width: number
    height: number
    caption?: CaptionInline[]
  }
  class CaptionInline {
    <<union>>
    kind
  }
  class CaptionText {
    kind: "text"
    text: string
  }
  class CaptionStrong {
    kind: "strong"
    text: string
  }
  class CaptionEm {
    kind: "em"
    text: string
  }
  class CaptionLink {
    kind: "link"
    href: string
    text: string
  }
  CaptionInline <|-- CaptionText
  CaptionInline <|-- CaptionStrong
  CaptionInline <|-- CaptionEm
  CaptionInline <|-- CaptionLink
  Figure --> CaptionInline : caption
  Block <|-- Paragraph
  Block <|-- Heading2
  Block <|-- BulletList
  Block <|-- OrderedList
  Block <|-- Figure
```

```mermaid
flowchart LR
  md["content/blog/slug.md"] --> fm["parseFrontmatter"]
  fm --> pb["parseBlocks (lib/blog-parse.ts)"]
  pb -- "each image src" --> img["createImageResolver (lib/blog-images.ts): allow-list, file exists, IHDR size"]
  img --> pb
  pb -- "caption line" --> ci["parseCaptionInlines: **bold**, *em*, [text](https://…)"]
  ci -- "each link href" --> url["validateCaptionHref: new URL(), https, no userinfo/port, exact host allow-list"]
  url --> ci
  ci --> pb
  pb --> blocks["Block[]"]
  blocks --> ba["BlogArticle: exhaustive switch → JSX"]
  ba --> html["static HTML, plain img"]
```

## Figure captions (PR #43)

A caption is the `*…*` line directly under an image line (the outer asterisks are the
delimiter). Inside it, and only there, three inline forms are parsed into
`CaptionInline = CaptionText | CaptionStrong | CaptionEm | CaptionLink` (spec names:
Text | Strong | Em | Link{href,text}):

- `**bold**` → `CaptionStrong`. A caption that starts with `**…**` renders that Strong as its
  title line (`<span class="block font-medium text-navy">`), and the rest in the body span,
  which is the pre-#40 figure markup. Any other Strong renders as `<strong>`.
- `*italic*` → `CaptionEm`, rendered `<em class="italic">`.
- `[text](https://…)` → `CaptionLink`, rendered `<a href rel="noopener noreferrer">`, no `target`.

Rules:

- **No nesting.** The content of Strong, Em and Link is plain text. Marker or HTML characters
  inside it (for example `[a *b* <i>](…)`) render literally.
- **Unmatched markers** (`**foo`, `*foo`, `[foo`, `[foo](`) become literal text. They never throw.
- **Rendering** uses React elements only: an exhaustive `switch (node.kind)` with a `never`
  check. There is no raw HTML and no `dangerouslySetInnerHTML`; JSX escapes all text.
- Body paragraphs keep their own inline rules. Only the caption line uses `CaptionInline`.

### Caption link checks (`validateCaptionHref`)

Every caption link is checked at build time. Any violation throws
`content/blog/<slug>.md:<line>: …`, so `next build` fails.

1. The raw href must not contain whitespace or control characters (tab, newline, CR). The URL
   parser would strip them silently, so this check runs on the raw text first.
2. `new URL(raw)` with no base. A scheme-relative `//evil.test` therefore throws.
3. `url.protocol === "https:"`. This rejects `http:`, `javascript:` and `data:`.
4. `url.username === ""` and `url.password === ""`, so no userinfo
   (`https://user:pw@openai.com/…`).
5. `url.port === ""`. `https://openai.com:443/…` passes because the parser normalizes the
   default port away. `https://openai.com:8443/…` fails.
6. `url.hostname` must exactly equal an entry in `CAPTION_LINK_HOSTS`. There is no suffix or
   substring matching, so `openai.com.evil.test`, `openai.com.` (trailing dot), punycode/IDN
   lookalikes (`xn--…`) and percent-encoded lookalikes fail. `https:\\evil.test` parses to host
   `evil.test` and fails. `OPENAI.COM` normalizes to `openai.com` and passes.
7. The rendered `href` is the serialized `url.href`, never the raw text.

`CAPTION_LINK_HOSTS` is a repo constant in `lib/blog-parse.ts`. **Adding a host is a spec
change** and needs a spec PR.

## Apex links from the blog host (PR #43)

Site links that must leave the blog host use `apexHref(path)` from `lib/site.ts`, which returns
`${site.url}${path}`. It is built from the `site.url` constant only, never from the request
`Host` header or the environment. The footer "Trust boundary" link is
`apexHref("/how-it-works#trust-boundary")`. `id="trust-boundary"` appears exactly once
site-wide, on the trust box (`components/TrustBoundary.tsx`) on `/how-it-works`.

Tests: `src/blog-renderer.test.ts`, `src/blog-zdr-figures.test.ts`, `src/blog-backdoor-post.test.ts`, `src/blog-caption-inline.test.ts`, `src/trust-boundary-link.test.ts`.
