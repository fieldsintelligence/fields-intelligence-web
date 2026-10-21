import Link from "next/link";
import { formatBlogDate, type Block, type CaptionInline, type InlineNode, type Post } from "@/lib/blog";

// Maps parsed blocks (lib/blog-parse.ts) to JSX. No parsing here, and no raw
// HTML: every string is a React text child or attribute, so it is escaped.

function RichText({ inlines }: { inlines: InlineNode[] }) {
  return inlines.map((node, index) => {
    if (node.type === "text") {
      return <span key={index}>{node.value}</span>;
    }
    if (node.type === "strong") {
      return (
        <strong key={index} className="font-medium text-navy">
          {node.value}
        </strong>
      );
    }
    if (node.type === "em") {
      return (
        <em key={index} className="italic">
          {node.value}
        </em>
      );
    }
    const external = node.href.startsWith("http");
    return (
      <a
        key={index}
        href={node.href}
        className="underline decoration-brass/60 underline-offset-4 hover:decoration-brass"
        {...(external ? { rel: "noreferrer" } : {})}
      >
        {node.value}
      </a>
    );
  });
}

const LINK_CLASS = "underline decoration-brass/60 underline-offset-4 hover:decoration-brass";

function assertNeverCaption(node: never): never {
  throw new Error(`Unhandled caption node: ${JSON.stringify(node)}`);
}

function CaptionNode({ node }: { node: CaptionInline }) {
  switch (node.kind) {
    case "text":
      return <span>{node.text}</span>;
    case "strong":
      return <strong className="font-medium text-navy">{node.text}</strong>;
    case "em":
      return <em className="italic">{node.text}</em>;
    case "link":
      return (
        <a href={node.href} className={LINK_CLASS} rel="noopener noreferrer">
          {node.text}
        </a>
      );
    default:
      return assertNeverCaption(node);
  }
}

/**
 * Figure caption (PR #43). A caption that starts with **…** renders it as the
 * title line, then the rest in the body span: the pre-#40 figure markup.
 */
function Caption({ caption }: { caption: CaptionInline[] }) {
  const [first, ...rest] = caption;
  const title = first && first.kind === "strong" ? first : null;
  let body = title ? rest : caption;
  if (title && body[0]?.kind === "text") {
    const lead = body[0].text.trimStart();
    body = lead ? [{ kind: "text", text: lead }, ...body.slice(1)] : body.slice(1);
  }
  return (
    <figcaption className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate">
      {title ? <span className="block font-medium text-navy">{title.text}</span> : null}
      <span className={title ? "mt-1 block" : "block"}>
        {body.map((node, index) => (
          <CaptionNode key={index} node={node} />
        ))}
      </span>
    </figcaption>
  );
}

function assertNever(block: never): never {
  throw new Error(`Unhandled blog block: ${JSON.stringify(block)}`);
}

function renderBlock(block: Block, index: number) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p key={index} className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate first:mt-0">
          <RichText inlines={block.text} />
        </p>
      );
    case "heading2":
      return (
        <h2
          key={index}
          className="mx-auto mt-12 max-w-3xl font-serif text-2xl font-normal leading-snug tracking-tight text-navy sm:text-3xl"
        >
          {block.text}
        </h2>
      );
    case "bulletList":
      return (
        <ul
          key={index}
          className="mx-auto mt-4 max-w-3xl list-disc space-y-2 pl-5 text-lg leading-relaxed text-slate"
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <RichText inlines={item} />
            </li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol
          key={index}
          className="mx-auto mt-4 max-w-3xl list-decimal space-y-2 pl-5 text-lg leading-relaxed text-slate"
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <RichText inlines={item} />
            </li>
          ))}
        </ol>
      );
    case "figure":
      return (
        <figure key={index} className="mx-auto mt-10 w-full max-w-5xl">
          {/* Plain img, not next/image: the served bytes are the committed bytes. */}
          <img
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-xl border border-line bg-cream"
          />
          {block.caption ? <Caption caption={block.caption} /> : null}
        </figure>
      );
    default:
      return assertNever(block);
  }
}

export function BlogArticle({ post }: { post: Post }) {
  return (
    <article className="border-b border-line bg-chalk">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <header className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-brass">
            <Link href="/blog">Blog</Link>
          </p>
          <h1 className="mt-3 font-serif text-4xl font-normal italic leading-snug tracking-tight text-navy sm:text-5xl">
            {post.title}
          </h1>
          <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />
          <p className="mt-4 text-sm text-slate">
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          </p>
        </header>

        <div className="mt-10">{post.blocks.map(renderBlock)}</div>
      </div>
    </article>
  );
}
