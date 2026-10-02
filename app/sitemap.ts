import type { MetadataRoute } from "next";
import { blogIndexUrl, getPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();

  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${site.url}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: blogIndexUrl,
      lastModified: posts[0] ? new Date(`${posts[0].date}T00:00:00Z`) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts.map(
      (post): MetadataRoute.Sitemap[number] => ({
        url: post.canonicalUrl,
        lastModified: new Date(`${post.date}T00:00:00Z`),
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
  ];
}
