import { existsSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import type { ImageResolver } from "./blog-parse";

/** Post images live in public/blog with lowercase names. */
export const BLOG_IMAGE_SRC = /^\/blog\/[a-z0-9-]+\.png$/;

/**
 * Exact paths allowed outside that pattern. The architecture diagram is
 * shared with /how-it-works. The two ZDR-post figures predate the lowercase
 * rule (renaming them would change their public URLs).
 */
export const ALLOWED_IMAGE_SRCS: readonly string[] = [
  "/assets/architecture-ribbons-reviewed.png",
  "/blog/blog-openai-api-retention-NotZDR.png",
  "/blog/blog-openai-async-safety-NotZDR.png",
];

export function isAllowedImageSrc(src: string): boolean {
  return BLOG_IMAGE_SRC.test(src) || ALLOWED_IMAGE_SRCS.includes(src);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from the PNG IHDR chunk. Throws if the file is not a PNG. */
export function readPngSize(file: string): { width: number; height: number } {
  const header = Buffer.alloc(24);
  const fd = openSync(file, "r");
  try {
    readSync(fd, header, 0, 24, 0);
  } finally {
    closeSync(fd);
  }
  const isPng =
    PNG_SIGNATURE.every((byte, index) => header[index] === byte) &&
    header.toString("ascii", 12, 16) === "IHDR";
  if (!isPng) throw new Error(`Blog image is not a PNG: ${file}`);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

/** Resolver used at build time: allow-listed src, file present under publicDir, size from IHDR. */
export function createImageResolver(publicDir: string): ImageResolver {
  return (src) => {
    if (!isAllowedImageSrc(src)) {
      throw new Error(`Blog image src is not allowed: ${src}`);
    }
    const file = join(publicDir, src);
    if (!existsSync(file)) {
      throw new Error(`Blog image file is missing: public${src}`);
    }
    return readPngSize(file);
  };
}
