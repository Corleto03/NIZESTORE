import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    let body;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // Beacon sendBeacon may send text or blob
      const text = await req.text();
      body = JSON.parse(text);
    }

    const { id_vista, segundos } = body;

    if (!id_vista || segundos === undefined) {
      return NextResponse.json({ message: "id_vista y segundos son requeridos" }, { status: 400 });
    }

    const parsedId = BigInt(id_vista);
    const parsedSeconds = Math.max(1, Math.min(86400, Math.round(Number(segundos))));

    await prisma.vista_pagina.update({
      where: { id_vista: parsedId },
      data: {
        tiempo_permanencia_seg: parsedSeconds
      }
    });

    return NextResponse.json({ success: true, dwell_seconds: parsedSeconds });
  } catch (error: any) {
    console.warn("Could not update dwell time:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
