import { NextRequest, NextResponse } from "next/server";
import { uploadService } from "@/services/upload.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {
    USER_NOT_FOUND: "upload.userNotFound",
    NOT_FOUND: "upload.notFound",
    INVALID_FILE_TYPE: "upload.invalidFileType",
    FILE_TOO_LARGE: "upload.fileTooLarge",
    NO_FILE: "upload.noFile",
  },
  statusMap: {
    USER_NOT_FOUND: 404,
    NOT_FOUND: 404,
    INVALID_FILE_TYPE: 400,
    FILE_TOO_LARGE: 400,
    NO_FILE: 400,
  },
  serviceName: "Upload",
});

type Params = { params: Promise<{ userId: string }> };

// POST /api/upload/user/:userId
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("photo");
    if (!file || !(file instanceof File)) throw new Error("NO_FILE");

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadService.uploadUserPhoto(userId, {
      mimetype: file.type,
      size: file.size,
      buffer,
    });
    return NextResponse.json({ message: t("upload.success"), data: { imageUrl } });
  } catch (error) {
    return handleError(error);
  }
}
