"use client";

import React, { useRef, useState, useCallback } from "react";
import { Camera } from "lucide-react";

const SERVER_URL = ""; // Single-app: uploads served same-origin via Next.js Route Handlers

interface ProfilePhotoUploadProps {
  /** Current photo URL (relative to server, e.g. /api/uploads/profile-photos/user.jpg) */
  currentPhotoUrl?: string | null;
  /** Name for fallback initial */
  name?: string | null;
  /** Upload endpoint — when provided, uploads immediately. When omitted, only previews. */
  uploadEndpoint?: string;
  /** Size in px */
  size?: number;
  /** Callback after successful upload (when uploadEndpoint is provided) */
  onUploadSuccess?: (imageUrl: string) => void;
  /** Callback when a file is selected (when no uploadEndpoint — preview-only mode) */
  onFileSelect?: (file: File) => void;
  /** External pending file to preview (used in create flow) */
  pendingFile?: File | null;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = React.memo(
  ({ currentPhotoUrl, name, uploadEndpoint, size = 80, onUploadSuccess, onFileSelect, pendingFile }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Client-side validation
        if (!["image/jpeg", "image/png"].includes(file.type)) {
          setError("Apenas JPEG e PNG são aceites");
          return;
        }
        if (file.size > 500 * 1024) {
          setError("Máximo 500KB");
          return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        // If no upload endpoint, just notify parent and stop here
        if (!uploadEndpoint) {
          onFileSelect?.(file);
          return;
        }

        // Upload immediately
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("photo", file);

          const res = await fetch(`${SERVER_URL}${uploadEndpoint}`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Erro ao carregar foto");
          }

          const data = await res.json();
          onUploadSuccess?.(data.data.imageUrl);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro ao carregar foto");
          setPreview(null);
        } finally {
          setIsUploading(false);
        }
      },
      [uploadEndpoint, onUploadSuccess, onFileSelect]
    );

    // Generate preview from pendingFile
    React.useEffect(() => {
      if (pendingFile && !preview) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(pendingFile);
      }
    }, [pendingFile, preview]);

    const displaySrc = preview
      ? preview
      : currentPhotoUrl
        ? `${SERVER_URL}${currentPhotoUrl}`
        : null;

    const initial = name?.charAt(0)?.toUpperCase() || "?";

    return (
      <div className="flex flex-col items-start gap-2">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={name || "Foto"}
              className="rounded-full object-cover w-full h-full"
            />
          ) : (
            <div
              className="rounded-full bg-brand-100 flex items-center justify-center text-brand-500 font-semibold w-full h-full"
              style={{ fontSize: size * 0.35 }}
            >
              {initial}
            </div>
          )}

          <label
            htmlFor={`photo-upload-${uploadEndpoint || "preview"}`}
            className="absolute right-0 bottom-0 flex items-center justify-center rounded-full border border-border bg-surface text-text-secondary cursor-pointer hover:bg-brand-500/5 transition-colors"
            style={{ width: size * 0.35, height: size * 0.35 }}
          >
            <input
              ref={fileInputRef}
              id={`photo-upload-${uploadEndpoint || "preview"}`}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Camera style={{ width: size * 0.18, height: size * 0.18 }} />
          </label>

          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-accent-red-400">{error}</p>}
        <p className="text-xs text-text-muted">
          JPEG ou PNG, máx. 500KB
        </p>
      </div>
    );
  }
);

ProfilePhotoUpload.displayName = "ProfilePhotoUpload";
export default ProfilePhotoUpload;
