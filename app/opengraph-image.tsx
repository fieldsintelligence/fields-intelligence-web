import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Fields Intelligence — Sovereign AI that never leaves the bank.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const tile = await readFile(join(process.cwd(), "public/brand/fi-tile.png"));
  const tileSrc = `data:image/png;base64,${tile.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fbfcfb",
          color: "#1a1c1b",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: 16,
            height: "100%",
            background: "#164a3a",
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
              src={tileSrc}
              alt=""
              width={120}
              height={138}
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
                  color: "#4a524e",
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
              color: "#4a524e",
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
