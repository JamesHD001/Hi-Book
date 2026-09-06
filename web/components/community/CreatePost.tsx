"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
type SelectedImage = { file: File; previewUrl: string };

async function prepareImage(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Only JPG, PNG, and WebP images are supported.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Each image must be 10 MB or smaller.");

  const bitmap = await createImageBitmap(file);
  const maxDimension = 2048;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not prepare this image.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("The image could not be converted.");
  if (blob.size > MAX_FILE_BYTES) throw new Error("The prepared image is larger than 10 MB.");
  return { blob, width, height };
}

export default function CreatePost() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => () => images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl)), [images]);

  const remaining = MAX_IMAGES - images.length;
  const canSubmit = useMemo(
    () => !submitting && (content.trim().length > 0 || images.length > 0),
    [content, images.length, submitting],
  );

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (incoming.length === 0) return;

    const combined = [...images];
    for (const file of incoming) {
      if (combined.length >= MAX_IMAGES) break;
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError("Only JPG, PNG, and WebP images are supported.");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError("Each image must be 10 MB or smaller.");
        continue;
      }
      combined.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setImages(combined);
  }

  function removeImage(index: number) {
    setImages((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (!canSubmit) return;

    const supabase = createClient();
    setSubmitting(true);
    let postId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error("Your session has expired. Please sign in again.");

      const cleanContent = content.trim();
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: cleanContent || null,
          visibility,
          status: "PUBLISHED",
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (postError || !post) throw new Error(postError?.message ?? "Could not create the post.");
      postId = post.id;

      for (let index = 0; index < images.length; index += 1) {
        const prepared = await prepareImage(images[index].file);
        const mediaId = crypto.randomUUID();
        const storagePath = `${userId}/${post.id}/${mediaId}.webp`;

        const { error: uploadError } = await supabase.storage.from("posts").upload(storagePath, prepared.blob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        uploadedPaths.push(storagePath);

        const { error: mediaError } = await supabase.from("post_media").insert({
          id: mediaId,
          post_id: post.id,
          media_type: "IMAGE",
          storage_path: storagePath,
          mime_type: "image/webp",
          file_size: prepared.blob.size,
          width: prepared.width,
          height: prepared.height,
          display_order: index,
        });
        if (mediaError) throw new Error(mediaError.message);
      }

      setContent("");
      setVisibility("PUBLIC");
      setImages([]);
      setSuccess(true);
      window.dispatchEvent(new CustomEvent("hibook:post-created"));
    } catch (caught) {
      if (uploadedPaths.length > 0) await supabase.storage.from("posts").remove(uploadedPaths);
      if (postId) await supabase.from("posts").delete().eq("id", postId);
      setError(caught instanceof Error ? caught.message : "Could not publish your post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Create a post">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Share something</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Create a post</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{content.length}/5000</span>
      </div>

      <form className="mt-5" onSubmit={submitPost}>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 5000))}
          placeholder="What would you like to share with the community?"
          rows={5}
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {images.map((image, index) => (
              <div key={image.previewUrl} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={`Selected image ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-950" aria-label={`Remove image ${index + 1}`}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleImageChange} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={remaining === 0 || submitting} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              Add photo{remaining === 1 ? "" : "s"} ({remaining} left)
            </button>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Visibility</span>
              <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} disabled={submitting} className="bg-transparent font-semibold outline-none">
                <option value="PUBLIC">Everyone</option>
                <option value="FOLLOWERS">Followers</option>
                <option value="PRIVATE">Only me</option>
              </select>
            </label>
          </div>

          <button type="submit" disabled={!canSubmit} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Publishing…" : "Publish post"}
          </button>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">Images are converted to WebP in your browser before upload. This removes embedded metadata such as GPS/EXIF and keeps post media private.</p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Your post has been published.</p>}
      </form>
    </section>
  );
}
