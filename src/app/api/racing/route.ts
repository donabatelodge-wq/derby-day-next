import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const basicAuth = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

    const res = await fetch(`https://api.theracingapi.com/v1/${endpoint}`, {
      headers: {
        Authorization: basicAuth,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Racing API error: ${res.status} ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch from Racing API" },
      { status: 500 }
    );
  }
}
