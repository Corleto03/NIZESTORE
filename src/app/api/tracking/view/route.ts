import { NextResponse } from "next/server";
import { trackPageView } from "@/lib/tracking";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tipo_pagina, id_producto, url } = body;

    const idVista = await trackPageView(
      tipo_pagina || "otro",
      id_producto ? parseInt(id_producto, 10) : undefined,
      url || ""
    );

    return NextResponse.json({ success: true, id_vista: idVista });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
