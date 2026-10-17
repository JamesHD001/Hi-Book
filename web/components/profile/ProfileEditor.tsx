"use client";

import { ChangeEvent, FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; name: string; code?: string };
type Privacy = "PUBLIC" | "PRIVATE";
type MessagePermission = "EVERYONE" | "FOLLOWERS" | "NO_ONE";

type ProfileEditorProps = {
  userId: string;
  initial: {
    displayName: string;
    bio: string;
    countryCode: string;
    profileVisibility: Privacy;
    countryVisibility: Privacy;
    messagePermission: MessagePermission;
    discoverable: boolean;
    languageIds: string[];
    interestIds: string[];
    avatarUrl: string | null;
  };
  languages: Option[];
  interests: Option[];
};

type CropOffset = { x: number; y: number };

function drawAvatarCrop(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: number,
  zoom: number,
  offset: CropOffset,
) {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const maxOffsetX = Math.max(0, (width - size) / 2);
  const maxOffsetY = Math.max(0, (height - size) / 2);
  const x = (size - width) / 2 + offset.x * maxOffsetX;
  const y = (size - height) / 2 + offset.y * maxOffsetY;

  context.clearRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);
}

function cropToWebp(
  image: HTMLImageElement,
  zoom: number,
  offset: CropOffset,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return Promise.reject(new Error("Your browser could not prepare the image."));
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawAvatarCrop(context, image, size, zoom, offset);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Your browser could not convert the image."));
          return;
        }
        if (blob.type !== "image/webp") {
          reject(new Error("Your browser does not support optimized WebP photos."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.86,
    );
  });
}

export default function ProfileEditor({
  userId,
  initial,
  languages,
  interests,
}: ProfileEditorProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [profileVisibility, setProfileVisibility] = useState(initial.profileVisibility);
  const [countryVisibility, setCountryVisibility] = useState(initial.countryVisibility);
  const [messagePermission, setMessagePermission] = useState(initial.messagePermission);
  const [discoverable, setDiscoverable] = useState(initial.discoverable);
  const [languageIds, setLanguageIds] = useState(initial.languageIds);
  const [interestIds, setInterestIds] = useState(initial.interestIds);
  const [cropDraft, setCropDraft] = useState<{ url: string } | null>(null);
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [avatarToUpload, setAvatarToUpload] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (avatarPreview?.startsWith("blob:")) {
      return () => URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  useEffect(() => {
    if (!cropDraft) return;
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 8192 || image.naturalHeight > 8192 || image.naturalWidth * image.naturalHeight > 40_000_000) {
        setError("That photo is too large to edit. Choose an image under 40 megapixels.");
        setCropDraft(null);
        return;
      }
      setCropImage(image);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
    };
    image.onerror = () => {
      setError("That image could not be read. Try another photo.");
      setCropDraft(null);
    };
    image.src = cropDraft.url;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [cropDraft]);

  useEffect(() => {
    if (cropDraft) return () => URL.revokeObjectURL(cropDraft.url);
  }, [cropDraft]);

  useEffect(() => {
    const canvas = cropCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !cropImage) return;

    const previewSize = 320;
    canvas.width = previewSize;
    canvas.height = previewSize;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    drawAvatarCrop(context, cropImage, previewSize, cropZoom, cropOffset);
  }, [cropImage, cropOffset, cropZoom]);

  const languageMap = useMemo(
    () => new Map(languages.map((language) => [language.id, language])),
    [languages],
  );
  const interestMap = useMemo(
    () => new Map(interests.map((interest) => [interest.id, interest])),
    [interests],
  );

  function toggleSelection(
    id: string,
    selected: string[],
    setSelected: (value: string[]) => void,
    limit: number,
  ) {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
      return;
    }
    if (selected.length >= limit) return;
    setSelected([...selected, id]);
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPEG, PNG, WebP, or other supported image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setCropImage(null);
    setCropDraft({ url: URL.createObjectURL(file) });
    setSuccess(null);
  }

  function handleCropPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!cropImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function handleCropPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !cropImage) return;

    const canvas = cropCanvasRef.current;
    const size = canvas?.width ?? 320;
    const displayScale = size / (canvas?.getBoundingClientRect().width ?? size);
    const scale = Math.max(size / cropImage.naturalWidth, size / cropImage.naturalHeight) * cropZoom;
    const maxOffsetX = Math.max(0, (cropImage.naturalWidth * scale - size) / 2);
    const maxOffsetY = Math.max(0, (cropImage.naturalHeight * scale - size) / 2);
    const deltaX = (event.clientX - drag.x) * displayScale;
    const deltaY = (event.clientY - drag.y) * displayScale;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };

    setCropOffset((current) => ({
      x: maxOffsetX ? Math.max(-1, Math.min(1, current.x + deltaX / maxOffsetX)) : current.x,
      y: maxOffsetY ? Math.max(-1, Math.min(1, current.y + deltaY / maxOffsetY)) : current.y,
    }));
  }

  function handleCropPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function nudgeCrop(x: number, y: number) {
    setCropOffset((current) => ({
      x: Math.max(-1, Math.min(1, current.x + x)),
      y: Math.max(-1, Math.min(1, current.y + y)),
    }));
  }

  async function applyAvatarCrop() {
    if (!cropImage || !cropDraft) return;

    setCropping(true);
    setError(null);
    try {
      const cropped = await cropToWebp(cropImage, cropZoom, cropOffset);
      setAvatarToUpload(cropped);
      setAvatarPreview(URL.createObjectURL(cropped));
      setCropDraft(null);
      setCropImage(null);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "We could not crop that photo.");
    } finally {
      setCropping(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = displayName.trim();
    const normalizedCountry = countryCode.trim().toUpperCase();
    const trimmedBio = bio.trim();

    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setError("Display name must be between 1 and 80 characters.");
      return;
    }
    if (trimmedBio.length > 500) {
      setError("Bio must be 500 characters or fewer.");
      return;
    }
    if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
      setError("Country must use its two-letter ISO code, such as NG or US.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let uploadedAvatarPath: string | null = null;

    try {
      if (avatarToUpload) {
        uploadedAvatarPath = `${userId}/profile-${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(uploadedAvatarPath, avatarToUpload, {
            contentType: "image/webp",
            upsert: false,
            cacheControl: "3600",
          });
        if (uploadError) throw uploadError;
      }

      const { error: profileUpdateError } = await supabase.rpc("update_profile_atomic", {
        p_display_name: trimmedName,
        p_bio: trimmedBio || null,
        p_country_code: normalizedCountry,
        p_profile_visibility: profileVisibility,
        p_country_visibility: countryVisibility,
        p_message_permission: messagePermission,
        p_discoverable: discoverable,
        p_language_ids: languageIds,
        p_interest_ids: interestIds,
        p_avatar_path: uploadedAvatarPath,
      });

      if (profileUpdateError) throw profileUpdateError;

      if (uploadedAvatarPath) {
        const { data } = await supabase.storage
          .from("avatars")
          .createSignedUrl(uploadedAvatarPath, 600);
        if (data?.signedUrl) setAvatarPreview(data.signedUrl);
        setAvatarToUpload(null);
      }

      setCountryCode(normalizedCountry);
      setBio(trimmedBio);
      setDisplayName(trimmedName);
      setSuccess("Your profile has been updated.");
      router.refresh();
    } catch (submitError) {
      if (uploadedAvatarPath) {
        await supabase.storage.from("avatars").remove([uploadedAvatarPath]);
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-3xl font-bold text-slate-500">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Your profile preview" className="h-full w-full object-cover" />
            ) : (
              displayName[0]?.toUpperCase() ?? "H"
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile photo</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Choose a photo, then position and zoom it to frame your avatar. Hi!Book stores a private optimized copy.</p>
            <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              {avatarPreview ? "Change photo" : "Choose photo"}
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
            </label>
          </div>
        </div>
        {cropDraft && (
          <div className="mt-8 grid gap-6 border-t border-(--border) pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
            <div className="flex flex-col items-center gap-3">
              <canvas
                ref={cropCanvasRef}
                aria-label="Avatar crop preview. Drag to reposition the photo."
                className="h-64 w-64 touch-none cursor-grab rounded-full bg-slate-100 shadow-inner active:cursor-grabbing"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
              />
              <p className="text-center text-xs text-(--text-secondary)">Drag the photo to reposition it. The circular frame shows how your avatar will appear.</p>
            </div>
            <div className="space-y-5">
              <label className="block">
                <span className="flex items-center justify-between text-sm font-semibold text-(--foreground)">
                  <span>Zoom</span>
                  <span>{cropZoom.toFixed(1)}×</span>
                </span>
                <input
                  aria-label="Avatar zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                  disabled={!cropImage}
                  className="mt-3 w-full accent-(--brand-primary)"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2" aria-label="Keyboard crop controls">
                <span className="w-full text-sm font-semibold text-(--foreground)">Fine-tune position</span>
                <button type="button" aria-label="Move photo left" onClick={() => nudgeCrop(-0.12, 0)} className="rounded-lg border border-(--border) px-3 py-2 text-sm font-semibold hover:bg-(--surface-secondary)">Left</button>
                <button type="button" aria-label="Move photo up" onClick={() => nudgeCrop(0, -0.12)} className="rounded-lg border border-(--border) px-3 py-2 text-sm font-semibold hover:bg-(--surface-secondary)">Up</button>
                <button type="button" aria-label="Move photo down" onClick={() => nudgeCrop(0, 0.12)} className="rounded-lg border border-(--border) px-3 py-2 text-sm font-semibold hover:bg-(--surface-secondary)">Down</button>
                <button type="button" aria-label="Move photo right" onClick={() => nudgeCrop(0.12, 0)} className="rounded-lg border border-(--border) px-3 py-2 text-sm font-semibold hover:bg-(--surface-secondary)">Right</button>
              </div>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setCropDraft(null);
                    setCropImage(null);
                    setError(null);
                  }}
                  className="rounded-xl border border-(--border) px-4 py-2.5 text-sm font-semibold text-(--foreground) hover:bg-(--surface-secondary)"
                >
                  Cancel crop
                </button>
                <button
                  type="button"
                  onClick={applyAvatarCrop}
                  disabled={!cropImage || cropping}
                  className="rounded-xl bg-(--brand-primary) px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--brand-primary-dark) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cropping ? "Preparing photo…" : "Use cropped photo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">About you</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">These are public profile fields unless your privacy settings say otherwise.</p>
        </div>
        <div className="mt-6 grid gap-5">
          <label>
            <span className="text-sm font-medium text-(--foreground)">Display name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} className="mt-2 w-full rounded-md border border-(--border) bg-(--surface) px-4 py-3 outline-none focus:border-(--brand-primary) focus:ring-2 focus:ring-(--brand-primary)/15" />
          </label>
          <label>
            <span className="text-sm font-medium text-(--foreground)">Bio</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} placeholder="Tell people a little about yourself..." className="mt-2 w-full resize-y rounded-md border border-(--border) bg-(--surface) px-4 py-3 outline-none focus:border-(--brand-primary) focus:ring-2 focus:ring-(--brand-primary)/15" />
            <span className="mt-1 block text-right text-xs text-(--muted)">{bio.length}/500</span>
          </label>
          <label>
            <span className="text-sm font-medium text-(--foreground)">Country</span>
            <input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} maxLength={2} className="mt-2 w-full rounded-md border border-(--border) bg-(--surface) px-4 py-3 uppercase outline-none focus:border-(--brand-primary) focus:ring-2 focus:ring-(--brand-primary)/15" />
            <span className="mt-1 block text-xs text-(--muted)">Two-letter ISO country code, for example NG.</span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Languages</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">Choose up to 5 languages you speak or understand.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {languages.length === 0 ? (
            <p className="text-sm text-(--text-secondary)">Language options will appear once the language catalog is seeded.</p>
          ) : languages.map((language) => {
            const selected = languageIds.includes(language.id);
            return (
              <button key={language.id} type="button" onClick={() => toggleSelection(language.id, languageIds, setLanguageIds, 5)} className={`rounded-md border px-3 py-2 text-sm font-medium ${selected ? "border-(--brand-primary) bg-(--brand-primary-soft) text-(--brand-primary-dark)" : "border-(--border) text-(--text-secondary) hover:bg-(--surface-secondary)"}`}>
                {language.name}{language.code ? ` (${language.code})` : ""}
              </button>
            );
          })}
        </div>
        {languageIds.length > 0 && <p className="mt-3 text-xs text-(--muted)">Selected: {languageIds.map((id) => languageMap.get(id)?.name).filter(Boolean).join(", ")}</p>}
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Interests</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">Choose up to 10 interests to improve relevant discovery.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {interests.length === 0 ? (
            <p className="text-sm text-(--text-secondary)">Interest options will appear once the interest catalog is seeded.</p>
          ) : interests.map((interest) => {
            const selected = interestIds.includes(interest.id);
            return (
              <button key={interest.id} type="button" onClick={() => toggleSelection(interest.id, interestIds, setInterestIds, 10)} className={`rounded-md border px-3 py-2 text-sm font-medium ${selected ? "border-(--brand-primary) bg-(--brand-primary-soft) text-(--brand-primary-dark)" : "border-(--border) text-(--text-secondary) hover:bg-(--surface-secondary)"}`}>
                {interest.name}
              </button>
            );
          })}
        </div>
        {interestIds.length > 0 && <p className="mt-3 text-xs text-(--muted)">Selected: {interestIds.map((id) => interestMap.get(id)?.name).filter(Boolean).join(", ")}</p>}
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Privacy & discovery</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">You control how people can find and interact with you.</p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="rounded-md border border-(--border) p-4">
            <span className="text-sm font-medium text-(--foreground)">Profile visibility</span>
            <select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as Privacy)} className="mt-2 w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 focus:border-(--brand-primary)">
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>
          <label className="rounded-md border border-(--border) p-4">
            <span className="text-sm font-medium text-(--foreground)">Country visibility</span>
            <select value={countryVisibility} onChange={(event) => setCountryVisibility(event.target.value as Privacy)} className="mt-2 w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 focus:border-(--brand-primary)">
              <option value="PUBLIC">Visible</option>
              <option value="PRIVATE">Hidden</option>
            </select>
          </label>
          <label className="rounded-md border border-(--border) p-4">
            <span className="text-sm font-medium text-(--foreground)">Who can message you?</span>
            <select value={messagePermission} onChange={(event) => setMessagePermission(event.target.value as MessagePermission)} className="mt-2 w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 focus:border-(--brand-primary)">
              <option value="EVERYONE">Everyone</option>
              <option value="FOLLOWERS">People I follow</option>
              <option value="NO_ONE">No one</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-md border border-(--border) p-4">
            <input type="checkbox" checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-(--brand-primary)" />
            <span>
              <span className="block text-sm font-medium text-(--foreground)">Appear in global discovery</span>
              <span className="mt-1 block text-xs leading-5 text-(--text-secondary)">Turn this off if you do not want eligible discovery surfaces to recommend your profile.</span>
            </span>
          </label>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.push("/profile")} className="rounded-md border border-(--border) px-5 py-3 text-sm font-semibold text-(--foreground) hover:bg-(--surface-secondary)">Cancel</button>
        <button type="submit" disabled={saving || Boolean(cropDraft) || cropping} className="rounded-md bg-(--brand-primary) px-5 py-3 text-sm font-semibold text-white hover:bg-(--brand-primary-dark) disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : cropDraft ? "Apply or cancel photo crop first" : "Save changes"}</button>
      </div>
    </form>
  );
}
