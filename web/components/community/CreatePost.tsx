"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
type SelectedImage = { file: File; previewUrl: string };
type PreparedImage = { blob: Blob; width: number; height: number; mediaId: string; storagePath: string };

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
    setSuccess(false);
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      const userId = authData.user?.id;
      if (!userId) throw new Error("Your session has expired. Please sign in again.");

      postId = crypto.randomUUID();
      const preparedImages: PreparedImage[] = [];

      for (const image of images) {
        const prepared = await prepareImage(image.file);
        const mediaId = crypto.randomUUID();
        const storagePath = `posts/${userId}/${postId}/${mediaId}.webp`;
        preparedImages.push({ ...prepared, mediaId, storagePath });
      }

      for (const prepared of preparedImages) {
        const { error: uploadError } = await supabase.storage.from("posts").upload(prepared.storagePath, prepared.blob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        uploadedPaths.push(prepared.storagePath);
      }

      const mediaMetadata = preparedImages.map((image) => ({
        storage_path: image.storagePath,
        mime_type: "image/webp",
        file_size: image.blob.size,
        width: image.width,
        height: image.height,
        alt_text: null,
      }));

      const { data: createdPostId, error: postError } = await supabase.rpc("create_post", {
        p_post_id: postId,
        p_content: content.trim(),
        p_visibility: visibility,
        p_media: mediaMetadata,
      });
      if (postError || !createdPostId) throw new Error(postError?.message ?? "Could not create the post.");
      if (createdPostId !== postId) throw new Error("The server returned an unexpected post id.");

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

  const visibilityLabel = visibility === "PUBLIC" ? "Everyone" : visibility === "FOLLOWERS" ? "Followers" : "Only me";

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm" aria-label="Create a post">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm">H!</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Share something</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-950">Create a post</h2>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{content.length}/5000</span>
        </div>
      </div>

      <form className="p-5 sm:p-6" onSubmit={submitPost}>
        <label htmlFor="post-content" className="sr-only">Post content</label>
        <textarea
          id="post-content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value.slice(0, 5000));
            setSuccess(false);
          }}
          placeholder="What would you like to share with the community?"
          rows={5}
          className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
        />

        {images.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Attached media</p>
              <p className="text-xs font-medium text-slate-400">{images.length} of {MAX_IMAGES}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              {images.map((image, index) => (
                <div key={image.previewUrl} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt={`Selected image ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-slate-950/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-slate-950"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    Remove
                  </button>
                  <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={inputRef} id="post-images" aria-label="Add photos to your post" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleImageChange} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={remaining === 0 || submitting}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add photo{remaining === 1 ? "" : "s"} <span className="text-slate-400">({remaining} left)</span>
            </button>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <span className="font-medium text-slate-500">Visibility</span>
              <select aria-label="Post visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} disabled={submitting} className="bg-transparent font-semibold text-slate-900 outline-none">
                <option value="PUBLIC">Everyone</option>
                <option value="FOLLOWERS">Followers</option>
                <option value="PRIVATE">Only me</option>
              </select>
            </label>
          </div>

          <button type="submit" disabled={!canSubmit} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
            {submitting ? "Publishing…" : "Publish post"}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span>Visible to <strong className="text-slate-700">{visibilityLabel}</strong></span>
          <span>Images are converted to private WebP uploads before publishing.</span>
        </div>

        {error && <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-700" role="alert">{error}</p>}
        {success && <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700" role="status">Your post has been published.</p>}
      </form>
    </section>
  );
}
