import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, _message: "Route désactivée temporairement" }, { status: 503 });
}
