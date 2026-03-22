import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Legacy Prisma/JWT endpoints were removed from this repo.
// The app now uses the JSON store + cookie-based admin auth.

export async function GET() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint disabled." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint disabled." }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint disabled." }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint disabled." }, { status: 410 });
}
