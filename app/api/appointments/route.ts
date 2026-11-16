import type { NextRequest } from "next/server";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/api/http";
import { createAppointment } from "@/lib/appointments/service";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const appointment = await createAppointment(body);
    return json(appointment, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
