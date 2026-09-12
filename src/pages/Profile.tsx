import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { levelFromXp } from "@/convex/gameRules";
import type { EquippedMap, HeroState } from "@/components/hero/HeroCrystal";
import HeroStage from "@/components/hero/HeroStage";
import GameShell from "@/components/GameShell";
import MoltenXpBar from "@/components/game/MoltenXpBar";
import BrandedLoading from "@/components/BrandedLoading";
import { Check, Loader2, Save, Swords, UserPlus } from "lucide-react";
import { toast } from "sonner";

const INTEREST_OPTIONS = [
  "Coding",
  "Mathematics",
  "Reading",
  "Fitness",
  "Running",
  "Writing",
  "Music",
  "Art",
  "Languages",
  "Discipline",
];

interface ProfileFields {
  key: string;
  name: string;
  displayName?: string;
  pronouns?: string;
  bio?: string;
  level: number;
  xp: number;
  streak: number;
  title: string;
  form: number;
  interests?: string[];
  focusAttrs?: string[];
}

interface PublicProfile {
  isMe: boolean;
  friendship: "none" | "pending" | "friends";
  privacy: string;
  profile: ProfileFields;
}

type EquippedRaw = Record<
  string,
  { key: string; name: string; tint: string; rarity: string; category: string; titleGrant?: string }
>;

export default function ProfilePage() {
  const { userKey } = useParams<{ userKey?: string }>();

  const myCharacter = useQuery(api.characters.getMyCharacter);
  const isOwnRoute = !userKey;

  // Own profile: reuse the live character doc. Other profiles: server-validated public view.
  const publicView = useQuery(
    api.social.getPublicProfile,
    isOwnRoute ? "skip" : { userKey: userKey as string },
  ) as PublicProfile | null | undefined;
  const myEquipped = useQuery(api.shop.getMyEquipped) as EquippedRaw | null | undefined;
  const friends = useQuery(api.social.listMyFriends) as ProfileFields[] | undefined;
  const incoming = useQuery(api.social.listMyFriendRequests) as
    | { requestId: string; fromKey: string }[]
    | undefined;

  const updateProfile = useMutation(api.characters.updateProfile);
  const sendRequest = useMutation(api.social.sendFriendRequest);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reqBusy, setReqBusy] = useState(false);
  const [acceptedIncoming, setAcceptedIncoming] = useState(false);
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    bio: "",
    interests: [] as string[],
  });
  const [formReady, setFormReady] = useState(false);

  const char = isOwnRoute ? myCharacter : null;
  const view: ProfileFields | null = isOwnRoute
    ? char
      ? {
          key: String(char.userId),
          name: char.name,
          displayName: char.displayName,
          pronouns: char.pronouns,
          bio: char.bio,
          level: char.level,
          xp: char.xp,
          streak: char.streak,
          title: myEquipped?.title?.titleGrant ?? char.title,
          form: char.form,
          interests: char.interests,
          focusAttrs: char.focusAttrs,
        }
      : null
    : publicView?.profile ?? null;

  const progress = useMemo(() => (view ? levelFromXp(view.xp) : null), [view?.xp]);

  const startEdit = () => {
    if (!view) return;
    setForm({
      name: view.name,
      displayName: view.displayName ?? "",
      bio: view.bio ?? "",
      interests: view.interests ?? [],
    });
    setFormReady(true);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        displayName: form.displayName,
        bio: form.bio,
        interests: form.interests,
      });
      toast.success("Profile saved.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (tag: string) => {
    setForm((f) => {
      const has = f.interests.includes(tag);
      if (has) return { ...f, interests: f.interests.filter((t) => t !== tag) };
      if (f.interests.length >= 6) return f;
      return { ...f, interests: [...f.interests, tag] };
    });
  };

  const handleAddFriend = async () => {
    if (!view) return;
    setReqBusy(true);
    try {
      const res = (await sendRequest({ toUserKey: view.key })) as {
        ok: boolean;
        accepted?: boolean;
      };
      toast.success(
        res.accepted ? "You are now allies." : "Ally request sent.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that request.");
    } finally {
      setReqBusy(false);
    }
  };

  if (myCharacter === undefined || (!isOwnRoute && publicView === undefined)) {
    return <BrandedLoading />;
  }

  // Own route but no character yet — onboarding hasn't been finished.
  if (isOwnRoute && !char) {
    return (
      <GameShell>
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
          <Swords className="size-8 text-muted-foreground/40" />
          <h1 className="font-display text-xl font-black tracking-tight">No character yet</h1>
          <p className="text-sm text-muted-foreground">
            Finish creating your hero to unlock your profile.
          </p>
          <Link
            to="/onboarding"
            className="glow-violet rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
          >
            Create my character
          </Link>
        </main>
      </GameShell>
    );
  }

  // Other hero not found (or private beyond visibility rules).
  if (!isOwnRoute && publicView === null) {
    return (
      <GameShell>
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
          <Swords className="size-8 text-muted-foreground/40" />
          <h1 className="font-display text-xl font-black tracking-tight">Hero not found</h1>
          <p className="text-sm text-muted-foreground">
            This hero does not exist, or their profile is private.
          </p>
          <Link
            to="/explore"
            className="rounded-xl border border-border/60 bg-secondary/40 px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary/70"
          >
            Back to Explore
          </Link>
        </main>
      </GameShell>
    );
  }

  if (!view || !progress) return <BrandedLoading />;

  const displayName = view.displayName || view.name;
  const equippedForHero: EquippedMap | null = isOwnRoute
    ? ((myEquipped as EquippedMap | null | undefined) ?? null)
    : null;
  const heroState: HeroState = "idle";
  const isMe = isOwnRoute || publicView?.isMe === true;
  const friendship = publicView?.friendship ?? (isMe ? "friends" : "none");
  const incomingFromThisHero = (incoming ?? []).some((r) => r.fromKey === view.key);
  const canRequest =
    !isMe && friendship === "none" && !incomingFromThisHero && !acceptedIncoming;

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        {isMe ? (
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-xl font-black tracking-tight">Your Profile</h1>
            {!editing && (
              <button
                onClick={startEdit}
                className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-secondary/70"
              >
                Edit profile
              </button>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <Link to="/explore" className="text-xs font-semibold text-primary hover:underline">
              ← Back to Explore
            </Link>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-12">
          {/* identity + hero stage */}
          <section className="surface-hero ring-edge grain relative overflow-hidden rounded-2xl p-5 lg:col-span-5">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 70% 45% at 50% 0%, oklch(0.68 0.19 295 / 18%), transparent 70%)",
              }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display truncate text-2xl font-black leading-tight">
                    {displayName}
                  </h2>
                  {view.displayName && view.displayName !== view.name && (
                    <p className="truncate text-xs text-muted-foreground">as {view.name}</p>
                  )}
                  <p className="text-gradient-violet font-display text-sm font-bold tracking-wide">
                    {view.title}
                  </p>
                  {view.pronouns && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{view.pronouns}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-display text-gradient-gold text-6xl font-black leading-none">
                    {view.level}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                    Level
                  </div>
                </div>
              </div>

              <div className="relative mx-auto h-56 w-full max-w-72 rounded-2xl sm:h-64">
                <HeroStage
                  form={view.form}
                  level={view.level}
                  state={heroState}
                  equipped={equippedForHero}
                  className="h-full w-full"
                />
              </div>

              <MoltenXpBar
                xpIntoLevel={progress.xpIntoLevel}
                needed={progress.nextLevelXp}
                level={view.level}
                compact
              />

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{view.xp.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total XP
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="flex items-center justify-center gap-1 font-mono text-lg font-bold">
                    {view.streak}
                    <span className="text-xs text-gold">d</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Streak
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* details column */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* bio / about */}
            <section className="surface-panel ring-edge rounded-2xl p-4 sm:p-5" aria-label="About">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                What they're building
              </h3>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="pf-name" className="text-xs font-semibold">
                      Character name
                    </label>
                    <input
                      id="pf-name"
                      value={form.name}
                      maxLength={24}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="pf-display" className="text-xs font-semibold">
                      Display name
                    </label>
                    <input
                      id="pf-display"
                      value={form.displayName}
                      maxLength={32}
                      onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="pf-bio" className="text-xs font-semibold">
                      Bio
                    </label>
                    <textarea
                      id="pf-bio"
                      value={form.bio}
                      maxLength={160}
                      rows={3}
                      placeholder="Learning to code, becoming healthier, and building things I'm proud of."
                      onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                      className="mt-1 w-full resize-none rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                    <div className="mt-0.5 text-right font-mono text-[10px] text-muted-foreground/60">
                      {form.bio.length} / 160
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold">Interests</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {INTEREST_OPTIONS.map((tag) => {
                        const active = form.interests.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleInterest(tag)}
                            aria-pressed={active}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              active
                                ? "bg-primary text-primary-foreground ring-1 ring-primary/40"
                                : "bg-secondary/50 text-muted-foreground ring-1 ring-border/60 hover:text-foreground"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving || form.name.trim().length < 2}
                      className="glow-violet flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {view.bio || (
                      <span className="italic text-muted-foreground">
                        {isMe
                          ? "Add a short bio so other heroes know what you're working toward."
                          : "This hero hasn't written a bio yet."}
                      </span>
                    )}
                  </p>
                  {view.interests && view.interests.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {view.interests.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {view.focusAttrs && view.focusAttrs.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                        Focused on
                      </span>
                      {view.focusAttrs.map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* friends / social */}
            <section className="surface-panel ring-edge rounded-2xl p-4 sm:p-5" aria-label="Allies">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {isMe ? "Your allies" : "Allies"}
                </h3>
                {!isMe && (
                  <>
                    {friendship === "friends" ? (
                      <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/25">
                        <Check className="size-3.5" />
                        Allies
                      </span>
                    ) : friendship === "pending" || incomingFromThisHero || acceptedIncoming ? (
                      <span className="rounded-lg bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border/60">
                        Requested
                      </span>
                    ) : (
                      <button
                        onClick={handleAddFriend}
                        disabled={reqBusy || !canRequest}
                        className="glow-violet flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
                      >
                        {reqBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )}
                        Add ally
                      </button>
                    )}
                  </>
                )}
              </div>
              {friends === undefined ? (
                <div className="h-14 animate-pulse rounded-lg bg-muted" />
              ) : friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isMe ? (
                    <>
                      No allies yet.{" "}
                      <Link to="/explore" className="font-semibold text-primary hover:underline">
                        Find heroes on Explore
                      </Link>
                      .
                    </>
                  ) : (
                    "No allies yet."
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => (
                    <motion.a
                      key={f.key}
                      href={`/hero/${f.key}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="surface-quest ring-edge flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/40"
                    >
                      <div className="font-display flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-xs font-black">
                        {(f.displayName || f.name)
                          .split(/\s+/)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {f.displayName || f.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          LV {f.level} · {f.title}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-gold">{f.streak}d</span>
                    </motion.a>
                  ))}
                </div>
              )}
            </section>

            {!isMe && publicView && publicView.privacy !== "public" && (
              <p className="text-center text-[11px] text-muted-foreground/70">
                This hero shares limited details ({publicView.privacy} profile).
              </p>
            )}
          </div>
        </div>
      </main>
    </GameShell>
  );
}
