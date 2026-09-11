import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No se seleccionó ningún archivo de imagen" }, { status: 400 });
    }

    // Validate mime type
    const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json({
        message: "Formato no válido. Solo se permiten imágenes (JPEG, PNG, WEBP, GIF, SVG)"
      }, { status: 400 });
    }

    // Validate size (10 MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "La imagen excede el límite máximo de 10 MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Target directory: public/images/products
    const uploadDir = path.join(process.cwd(), "public", "images", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    // Clean filename
    const originalName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
    const uniqueName = `prod_${Date.now()}_${originalName}`;
    const filePath = path.join(uploadDir, uniqueName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/images/products/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      size: file.size,
      type: file.type
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ message: error.message || "Error al subir la imagen" }, { status: 500 });
  }
}
