import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "GrosirPJ API is running!", version: "2.0" });
}
