import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const credentials = Buffer.from(`${username.trim()}:${password.trim()}`).toString("base64");
    const basicAuth = `Basic ${credentials}`;

    const url = `https://api.theracingapi.com/v1/${endpoint}`;

    console.log("Calling:", url);

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
      console.error("API error:", res.status, responseText);
      return NextResponse.json(
        { error: `Racing API error: ${res.status}`, detail: responseText },
        { status: res.status }
      );
    }

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch" },
      { status: 500 }
    );
  }
}
