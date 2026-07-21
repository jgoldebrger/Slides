import { NextResponse } from "next/server";

/** Liveness for load balancers / ops — unauthenticated. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "updatedeck",
    time: new Date().toISOString(),
  });
}
