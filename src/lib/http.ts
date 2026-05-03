import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  code?: string;
};

export function jsonError(
  message: string,
  status: number,
  code?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(code ? { error: message, code } : { error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
