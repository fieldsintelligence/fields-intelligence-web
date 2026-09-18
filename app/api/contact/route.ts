import { NextResponse } from "next/server";
import { validateContact, type ContactPayload } from "@/lib/contact";
import { site } from "@/lib/site";

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const errors = validateContact(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { ok: false, error: Object.values(errors)[0], errors },
      { status: 400 },
    );
  }

  const summary = [
    `New Fields pilot inquiry`,
    `Name: ${body.name.trim()}`,
    `Email: ${body.email.trim()}`,
    `Organization: ${body.organization.trim()}`,
    `Role: ${body.role || "(not specified)"}`,
    "",
    body.message.trim(),
  ].join("\n");

  if (process.env.NODE_ENV !== "production") {
    console.info(`[contact] to ${site.email}\n${summary}`);
  }

  return NextResponse.json({ ok: true });
}
