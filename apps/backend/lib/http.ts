import { NextResponse } from "next/server";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type,x-user-id,x-role,x-roles,x-profile-kind",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      ...init?.headers
    }
  });
}

export function handleError(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  console.error(error);
  return json({ error: "Internal server error" }, { status: 500 });
}

export function options() {
  return json({}, { status: 204 });
}
