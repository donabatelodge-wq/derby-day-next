import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const credentials = `${username.trim()}:${password.trim()}`;
    const basicAuth = "Basic " + Buffer.from(credentials).toString("base64");

    const url = `https://api.theracingapi.com/v1/${endpoint}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": basicAuth,
        "Accept": "application/json",
      },
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Racing API error: ${res.status} ${res.statusText}`, detail: responseText },
        { status: res.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch from Racing API" },
      { status: 500 }
    );
  }
}
