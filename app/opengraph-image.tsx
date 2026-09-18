import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Fields Intelligence — Sovereign AI that never leaves the bank.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const mark = await readFile(
    join(process.cwd(), "public/brand/fi-monogram-midnight-ledger.png"),
  );
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F4F1EA",
          color: "#0B1F33",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: 16,
            height: "100%",
            background: "#0B1F33",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <img
              src={markSrc}
              alt=""
              width={112}
              height={106}
              style={{ objectFit: "contain" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 56,
                  fontFamily: "sans-serif",
                  fontWeight: 600,
                  letterSpacing: -1,
                }}
              >
                Fields
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontFamily: "sans-serif",
                  fontWeight: 400,
                  color: "#0B1F33",
                }}
              >
                Intelligence
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 42,
              lineHeight: 1.25,
              maxWidth: 820,
              fontFamily: "sans-serif",
              fontWeight: 500,
            }}
          >
            Sovereign AI that never leaves the bank.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#5C6B7A",
              fontFamily: "sans-serif",
            }}
          >
            fieldsintelligence.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
