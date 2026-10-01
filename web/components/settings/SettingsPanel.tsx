"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ChevronRight, LockKeyhole, LogOut, Mail, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/auth/LogoutButton";

type SettingsPanelProps = {
  userId: string;
  email: string;
  initialPreferences: {
    languageCode: string;
    autoplayMedia: boolean;
    reducedMotion: boolean;
  };
  initialNotifications: {
    follows: boolean;
    likes: boolean;
    comments: boolean;
    messages: boolean;
    mentions: boolean;
    system: boolean;
    moderation: boolean;
    push: boolean;
    email: boolean;
  };
};

type Notice = { type: "success" | "error"; text: string } | null;

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-(--brand-primary)" : "bg-(--border)"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function SettingsPanel({ userId, email, initialPreferences, initialNotifications }: SettingsPanelProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function savePreferences(next: typeof preferences) {
    const previous = preferences;
    setPreferences(next);
    setSavingPreferences(true);
    setNotice(null);

    const supabase = createClient();
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: userId,
      language_code: next.languageCode,
      theme: "SYSTEM",
      autoplay_media: next.autoplayMedia,
      reduced_motion: next.reducedMotion,
    });

    setSavingPreferences(false);
    if (error) {
      setPreferences(previous);
      setNotice({ type: "error", text: "We could not save that preference. Please try again." });
      return;
    }
    setNotice({ type: "success", text: "Preferences saved." });
  }

  async function saveNotifications(next: typeof notifications) {
    const previous = notifications;
    setNotifications(next);
    setSavingNotifications(true);
    setNotice(null);

    const supabase = createClient();
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: userId,
      follows_enabled: next.follows,
      likes_enabled: next.likes,
      comments_enabled: next.comments,
      messages_enabled: next.messages,
      mentions_enabled: next.mentions,
      system_enabled: next.system,
      moderation_enabled: next.moderation,
      push_enabled: next.push,
      email_enabled: next.email,
    });

    setSavingNotifications(false);
    if (error) {
      setNotifications(previous);
      setNotice({ type: "error", text: "We could not save that notification setting. Please try again." });
      return;
    }
    setNotice({ type: "success", text: "Notification settings saved." });
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div role={notice.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {notice.text}
        </div>
      )}

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-(--brand-primary-soft) text-(--brand-primary-dark)"><UserRound size={20} aria-hidden="true" /></div>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold text-(--foreground)">Account</h2><p className="mt-1 text-sm text-(--text-secondary)">Your account identity and profile controls.</p></div>
        </div>
        <div className="mt-6 divide-y divide-(--divider) rounded-md border border-(--border)">
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="min-w-0"><p className="text-sm font-medium text-(--foreground)">Email address</p><p className="mt-1 truncate text-sm text-(--text-secondary)">{email || "No email address available"}</p></div>
            <Mail size={18} className="shrink-0 text-(--muted)" aria-hidden="true" />
          </div>
          <Link href="/profile" className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-(--surface-secondary)">
            <div><p className="text-sm font-medium text-(--foreground)">Profile and privacy</p><p className="mt-1 text-sm text-(--text-secondary)">Edit your identity, visibility, discovery, languages, and interests.</p></div>
            <ChevronRight size={18} className="shrink-0 text-(--muted)" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-(--surface-secondary) text-(--text-secondary)"><ShieldCheck size={20} aria-hidden="true" /></div><div><h2 className="text-lg font-semibold text-(--foreground)">Preferences</h2><p className="mt-1 text-sm text-(--text-secondary)">Control how Hi!Book behaves while you use it.</p></div></div>
        <div className="mt-6 divide-y divide-(--divider) rounded-md border border-(--border)">
          <div className="flex items-center justify-between gap-6 px-4 py-4"><div><p className="text-sm font-medium text-(--foreground)">Autoplay media</p><p className="mt-1 text-sm text-(--text-secondary)">Allow supported media to start automatically.</p></div><Toggle checked={preferences.autoplayMedia} label="Autoplay media" onChange={(value) => void savePreferences({ ...preferences, autoplayMedia: value })} /></div>
          <div className="flex items-center justify-between gap-6 px-4 py-4"><div><p className="text-sm font-medium text-(--foreground)">Reduce motion</p><p className="mt-1 text-sm text-(--text-secondary)">Prefer reduced animation and movement.</p></div><Toggle checked={preferences.reducedMotion} label="Reduce motion" onChange={(value) => void savePreferences({ ...preferences, reducedMotion: value })} /></div>
        </div>
        {savingPreferences && <p className="mt-3 text-xs text-(--muted)" role="status">Saving preferences…</p>}
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-(--brand-accent-soft) text-(--foreground)"><Bell size={20} aria-hidden="true" /></div><div><h2 className="text-lg font-semibold text-(--foreground)">Notifications</h2><p className="mt-1 text-sm text-(--text-secondary)">Choose which activity can notify you.</p></div></div>
        <div className="mt-6 divide-y divide-(--divider) rounded-md border border-(--border)">
          {([
            ["follows", "New followers", "When someone follows you."],
            ["likes", "Post likes", "When someone likes your post."],
            ["comments", "Comments", "When someone comments on your post."],
            ["messages", "Messages", "When you receive a direct message."],
            ["mentions", "Mentions and tags", "When someone mentions or tags you."],
            ["system", "System updates", "Important account and platform notices."],
            ["moderation", "Moderation", "Updates about reports and moderation decisions."],
            ["push", "Push notifications", "Allow notification delivery through supported push channels."],
            ["email", "Email notifications", "Allow supported notification emails."],
          ] as const).map(([key, title, description]) => (
            <div key={key} className="flex items-center justify-between gap-6 px-4 py-4"><div><p className="text-sm font-medium text-(--foreground)">{title}</p><p className="mt-1 text-sm text-(--text-secondary)">{description}</p></div><Toggle checked={notifications[key]} label={title} onChange={(value) => void saveNotifications({ ...notifications, [key]: value })} /></div>
          ))}
        </div>
        {savingNotifications && <p className="mt-3 text-xs text-(--muted)" role="status">Saving notification settings…</p>}
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-(--surface-secondary) text-(--text-secondary)"><LockKeyhole size={20} aria-hidden="true" /></div><div><h2 className="text-lg font-semibold text-(--foreground)">Security and access</h2><p className="mt-1 text-sm text-(--text-secondary)">Use the existing authentication flows to manage account access.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/forgot-password" className="flex items-center justify-between rounded-md border border-(--border) px-4 py-3 text-sm font-semibold text-(--foreground) transition hover:bg-(--surface-secondary)">Reset password <ChevronRight size={17} aria-hidden="true" /></Link>
          <Link href="/account-deletion" className="flex items-center justify-between rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-50">Manage account deletion <ChevronRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-(--surface-secondary) text-(--text-secondary)"><MessageCircle size={20} aria-hidden="true" /></div><div><h2 className="text-lg font-semibold text-(--foreground)">Session</h2><p className="mt-1 text-sm text-(--text-secondary)">Sign out of the current Hi!Book session on this device.</p></div></div>
        <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-(--border) px-4 py-4"><div className="flex items-center gap-3 text-sm text-(--text-secondary)"><LogOut size={18} aria-hidden="true" />Current session</div><LogoutButton /></div>
      </section>
    </div>
  );
}
