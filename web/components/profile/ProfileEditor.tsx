"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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

function resizeToWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const size = 512;
      const scale = Math.min(size / image.width, size / image.height, 1);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Your browser could not prepare the image."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Your browser could not convert the image."));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        0.86,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That image could not be read."));
    };

    image.src = objectUrl;
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setAvatarFile(file);
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
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

    try {
      if (avatarFile) {
        const webp = await resizeToWebp(avatarFile);
        const path = `${userId}/profile.webp`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, webp, {
            contentType: "image/webp",
            upsert: true,
            cacheControl: "3600",
          });
        if (uploadError) throw uploadError;

        const { error: avatarDbError } = await supabase
          .from("profiles")
          .update({ avatar_path: path })
          .eq("user_id", userId);
        if (avatarDbError) throw avatarDbError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: trimmedName, bio: trimmedBio || null })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      const { error: countryError } = await supabase
        .from("users")
        .update({ country_code: normalizedCountry })
        .eq("id", userId);
      if (countryError) throw countryError;

      const { error: privacyError } = await supabase
        .from("user_privacy_settings")
        .update({
          profile_visibility: profileVisibility,
          country_visibility: countryVisibility,
          message_permission: messagePermission,
          discoverable,
        })
        .eq("user_id", userId);
      if (privacyError) throw privacyError;

      const { error: languageDeleteError } = await supabase
        .from("user_language")
        .delete()
        .eq("user_id", userId);
      if (languageDeleteError) throw languageDeleteError;

      if (languageIds.length > 0) {
        const { error: languageInsertError } = await supabase
          .from("user_language")
          .insert(languageIds.map((languageId) => ({ user_id: userId, language_id: languageId })));
        if (languageInsertError) throw languageInsertError;
      }

      const { error: interestDeleteError } = await supabase
        .from("user_interest")
        .delete()
        .eq("user_id", userId);
      if (interestDeleteError) throw interestDeleteError;

      if (interestIds.length > 0) {
        const { error: interestInsertError } = await supabase
          .from("user_interest")
          .insert(interestIds.map((interestId) => ({ user_id: userId, interest_id: interestId })));
        if (interestInsertError) throw interestInsertError;
      }

      if (avatarFile) {
        const { data } = await supabase.storage
          .from("avatars")
          .createSignedUrl(`${userId}/profile.webp`, 600);
        if (data?.signedUrl) setAvatarPreview(data.signedUrl);
        setAvatarFile(null);
      }

      setCountryCode(normalizedCountry);
      setBio(trimmedBio);
      setDisplayName(trimmedName);
      setSuccess("Your profile has been updated.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
            <p className="mt-1 text-sm leading-6 text-slate-600">Use a clear image. Hi!Book stores a private optimized copy.</p>
            <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Upload photo
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">About you</h2>
          <p className="mt-1 text-sm text-slate-500">These are public profile fields unless your privacy settings say otherwise.</p>
        </div>
        <div className="mt-6 grid gap-5">
          <label>
            <span className="text-sm font-medium text-slate-800">Display name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-800">Bio</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} placeholder="Tell people a little about yourself..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            <span className="mt-1 block text-right text-xs text-slate-500">{bio.length}/500</span>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-800">Country</span>
            <input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} maxLength={2} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            <span className="mt-1 block text-xs text-slate-500">Two-letter ISO country code, for example NG.</span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Languages</h2>
          <p className="mt-1 text-sm text-slate-500">Choose up to 5 languages you speak or understand.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {languages.length === 0 ? (
            <p className="text-sm text-slate-500">Language options will appear once the language catalog is seeded.</p>
          ) : languages.map((language) => {
            const selected = languageIds.includes(language.id);
            return (
              <button key={language.id} type="button" onClick={() => toggleSelection(language.id, languageIds, setLanguageIds, 5)} className={`rounded-full border px-3 py-2 text-sm font-medium ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                {language.name}{language.code ? ` (${language.code})` : ""}
              </button>
            );
          })}
        </div>
        {languageIds.length > 0 && <p className="mt-3 text-xs text-slate-500">Selected: {languageIds.map((id) => languageMap.get(id)?.name).filter(Boolean).join(", ")}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Interests</h2>
          <p className="mt-1 text-sm text-slate-500">Choose up to 10 interests to improve relevant discovery.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {interests.length === 0 ? (
            <p className="text-sm text-slate-500">Interest options will appear once the interest catalog is seeded.</p>
          ) : interests.map((interest) => {
            const selected = interestIds.includes(interest.id);
            return (
              <button key={interest.id} type="button" onClick={() => toggleSelection(interest.id, interestIds, setInterestIds, 10)} className={`rounded-full border px-3 py-2 text-sm font-medium ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                {interest.name}
              </button>
            );
          })}
        </div>
        {interestIds.length > 0 && <p className="mt-3 text-xs text-slate-500">Selected: {interestIds.map((id) => interestMap.get(id)?.name).filter(Boolean).join(", ")}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Privacy & discovery</h2>
          <p className="mt-1 text-sm text-slate-500">You control how people can find and interact with you.</p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="rounded-xl border border-slate-200 p-4">
            <span className="text-sm font-medium text-slate-800">Profile visibility</span>
            <select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as Privacy)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>
          <label className="rounded-xl border border-slate-200 p-4">
            <span className="text-sm font-medium text-slate-800">Country visibility</span>
            <select value={countryVisibility} onChange={(event) => setCountryVisibility(event.target.value as Privacy)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="PUBLIC">Visible</option>
              <option value="PRIVATE">Hidden</option>
            </select>
          </label>
          <label className="rounded-xl border border-slate-200 p-4">
            <span className="text-sm font-medium text-slate-800">Who can message you?</span>
            <select value={messagePermission} onChange={(event) => setMessagePermission(event.target.value as MessagePermission)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="EVERYONE">Everyone</option>
              <option value="FOLLOWERS">People I follow</option>
              <option value="NO_ONE">No one</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
            <input type="checkbox" checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <span>
              <span className="block text-sm font-medium text-slate-800">Appear in global discovery</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Turn this off if you do not want eligible discovery surfaces to recommend your profile.</span>
            </span>
          </label>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.push("/profile")} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
