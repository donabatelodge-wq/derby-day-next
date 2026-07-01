import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    const username = process.env.RACING_API_USERNAME;
    const password = process.env.RACING_API_PASSWORD;

    if (!username || !password) {
      return NextResponse.json({ error: "Racing API credentials not configured in environment variables" }, { status: 500 });
    }

    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    const basicAuth = `Basic ${credentials}`;
    const url = `https://api.theracingapi.com/v1/${endpoint}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": basicAuth,
        "Accept": "application/json",
        "User-Agent": "DerbyDay/1.0",
      },
      cache: "no-store",
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Racing API error: ${res.status}`, detail: responseText },
        { status: res.status }
      );
    }

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch" },
      { status: 500 }
    );
  }
}
