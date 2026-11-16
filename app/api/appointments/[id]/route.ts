import type { NextRequest } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  json,
  noContent,
  readJson,
} from "@/lib/api/http";
import {
  deleteAppointment,
  updateAppointment,
} from "@/lib/appointments/service";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/appointments/[id]">,
) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const { id } = await ctx.params;
    const appointment = await updateAppointment(id, body);
    return json(appointment);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/appointments/[id]">,
) {
  try {
    assertSameOrigin(request);
    const { id } = await ctx.params;
    await deleteAppointment(id);
    return noContent();
  } catch (e) {
    return errorResponse(e);
  }
}
