import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "profile-photos");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

// GET /api/uploads/profile-photos/:filename — serves uploaded profile photos
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal: only allow basename with a known image extension
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();
  if (!CONTENT_TYPES[ext]) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const filepath = path.join(UPLOADS_DIR, safeName);
  if (!filepath.startsWith(UPLOADS_DIR) || !fs.existsSync(filepath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Cache-Control": "public, max-age=86400",
    },
  });
}
