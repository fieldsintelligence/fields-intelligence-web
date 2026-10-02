import Image from "next/image";
import Link from "next/link";
import { formatBlogDate, type InlineNode, type Post } from "@/lib/blog";

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

        <div className="mt-10">
          {post.blocks.map((block, index) => {
            if (block.type === "paragraph") {
              return (
                <p
                  key={index}
                  className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate first:mt-0"
                >
                  <RichText inlines={block.inlines} />
                </p>
              );
            }
            if (block.type === "list") {
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
            }
            return (
              <figure key={block.id} className="mx-auto mt-10 w-full max-w-5xl">
                <Image
                  src={block.src}
                  alt={block.alt}
                  width={block.width}
                  height={block.height}
                  unoptimized
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="h-auto w-full rounded-xl border border-line bg-cream"
                  style={{ width: "100%", height: "auto" }}
                />
                <figcaption className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate">
                  <span className="block font-medium text-navy">{block.title}</span>
                  <span className="mt-1 block">
                    <RichText inlines={block.caption} />
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </article>
  );
}
