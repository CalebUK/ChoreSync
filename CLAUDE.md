# ChoreSync — Project Brief

This file is the source of truth for what ChoreSync is and how it must be built.
Read it fully before changing anything. Several design decisions below are
deliberate and load-bearing — they're marked **INVARIANT** and must not be
"simplified" away without an explicit instruction from the owner.

---

## What it is

ChoreSync is a family chore-tracking mobile app. A parent assigns chores to
their kids; kids complete them and earn **stars** (an in-app currency); stars are
spent on **rewards** the parent has set up (a reward chart — e.g. movie night,
extra screen time). There are two sides to the app: a **parent app** and a
**kid app**, in one project.

Design philosophy worth keeping in mind: motivation without making kids "glued"
to the phone. We deliberately dropped an earlier idea for a Tamagotchi-style
virtual pet/garden minigame in favour of the plain reward chart, for exactly this
reason. Don't reintroduce a minigame unless asked.

---

## Tech stack

- **Expo (React Native)** — SDK 56 / React Native 0.85 (confirm current at build time).
- **Firebase JS SDK** — Auth (email/password), Firestore, Storage, Cloud Functions.
- **expo-camera** — the modern `CameraView` API for the photo step (camera only, no gallery).
- Auth persistence in React Native uses `initializeAuth` + `getReactNativePersistence(AsyncStorage)`.

---

## Current state of the build

A real Expo project skeleton exists (not a mockup). It runs the **full loop**
on-device using an **in-memory store** — no backend yet. You can: assign a chore,
complete it as a kid, approve it as a parent, watch stars land, redeem a reward,
and see the request appear in the parent's Approvals.

Files:
- `src/types.ts` — the domain model (single source of truth for data shapes).
- `src/store.tsx` — the in-memory store. **All data mutations go through its actions.**
- `src/firebase.ts` — Firebase wiring, written but **not imported yet**; the demo runs entirely on the in-memory store. Contains the intended Firestore layout and the list of server-authoritative operations.
- `app/parent/`, `app/kid/` — the two app surfaces.
- `README.md` — setup + roadmap.

To run: clean Expo baseline, drop in `app/` and `src/`, `npx expo start`, scan the
QR with Expo Go. No extra packages needed for the in-memory demo.

---

## INVARIANTS (do not undo these)

1. **Balances are never stored.** A kid's star total is *always* the sum of their
   `ledger` entries. Every earn, spend, bonus, and refund is one append-only
   `LedgerEntry` row. This keeps the economy auditable and impossible to desync.
   Never add a cached `balance` field that's written directly.

2. **Chores are a start date + a repeat rule, never a pre-expanded list of dates.**
   Future occurrences are *derived* from the rule. A scheduled job materialises
   them later; they are not stored ahead of time.

3. **Chores reference a kid by stable ID, never by name.** Renaming a child must
   never orphan their chores.

4. **`src/store.tsx` actions are the only place data changes.** This is what makes
   the Firestore migration a contained job (swap action bodies) rather than a
   rewrite. Keep all reads/writes funnelled through it.

---

## Data model (see `src/types.ts`)

- `RepeatRule`: `{ once, date }` | `{ daily, startDate }` | `{ weekly, startDate, weekday }` (weekday = JS getDay, 0=Sun..6=Sat). Dates are ISO `YYYY-MM-DD` local-day strings.
- `LatePolicy`: `'full' | 'half' | 'none'` — how many stars are awarded if a chore is completed after its due date.
- `Assignment`: `{ kid, kidId }` (one named child) | `{ free }` (free-for-all, first to *complete* wins) | `{ everyone }` (a separate copy materialised per child).
- Entities: `Family`, `Kid`, `Chore`, `Completion`, `Reward`, `Redemption`, `LedgerEntry`.
- `Family.parentUids[]` holds the Firebase Auth UID(s) of the parent account(s).

---

## Firestore layout (mirrors `types.ts`)

```
families/{familyId}
families/{familyId}/kids/{kidId}
families/{familyId}/chores/{choreId}
families/{familyId}/completions/{completionId}
families/{familyId}/rewards/{rewardId}
families/{familyId}/redemptions/{redemptionId}
families/{familyId}/ledger/{entryId}        <- balances = sum of deltas
```

---

## Accounts & auth

- **One family account per family**, owned by the parent(s), with real Firebase
  email/password authentication.
- **Kids don't get email accounts.** They pick their profile from a picker and
  log in with a **PIN**. (Kids often have no email; this is the cleaner pattern.)

---

## Per-chore options

Two independent boolean switches on every chore:

- `requiresPhoto` — kid must attach a camera photo when completing.
- `requiresApproval` — controls **when stars are awarded**:
  - approval **on** → stars land when the parent approves.
  - approval **off** → stars land the instant the kid marks it done.
- A photo *without* approval is still useful — it's stored as a record the parent
  can spot-check later.
- Interaction with free-for-all:
  - free-for-all + approval **off** → locks and pays at the same moment.
  - free-for-all + approval **on** → locks when the kid submits, pays on approval;
    a rejection reopens it to everyone.

---

## Economy & late chores

- Currency is **stars**, spent on rewards (the reward chart).
- A **bonus** is just a manual positive star transaction — same as a chore payout.
- **Late completion** is governed by the chore's `LatePolicy` (full / half / none).

---

## Redemption flow (deliberate)

- Redeeming a reward **deducts stars immediately**, not at approval — so a kid
  can't "spend" the same 30 stars on three things while each waits in the queue.
  The balance the kid sees is always real.
- Parent approval is about the **choice** ("yes, you can have movie night"), not
  the accounting. A **decline refunds automatically**.
- After approval the reward is owed, so it sits in **"Still to give"** until the
  parent marks it handed over.
- Redemption states: `requested → approved → given` (or `declined`-with-refund).
  The full list (awaiting / approved / given / declined) is the history.
- Completion states: `submitted → approved | rejected`.

---

## UI specifics

- **Chore cards are colour-coded by urgency:** red = overdue, amber = due today or
  tomorrow, green = later.
- **Parent — child detail screen:** lists the kid's chores; a quick **re-assign**
  button; and tapping the chore itself opens a **full editor** to change the date,
  the star amount, the repeat rule, the late-star policy, or delete it.
- **Parent — Approvals:** queue of completions and redemptions awaiting decision.

---

## Notifications (two distinct kinds)

- **Chore deadline approaching (for the kid):** a **local notification** scheduled
  on the device. No server needed; works offline.
- **Chore completed (for the parent):** a **server-driven push via FCM**, fired by
  a Cloud Function when the completion is written (it's triggered by someone else's
  action, so it can't be local).

---

## Server-authoritative operations (SECURITY — never trust the client)

These must run as Firestore transactions / Cloud Functions, never on the phone:

1. **Free-for-all atomic claim.** When a kid submits a free-for-all chore, a
   transaction reads the chore, checks `ownerId == null`, and sets it to that kid.
   Two kids submitting at once can't both win; the loser gets "already completed".
2. **Awarding stars.** A positive `ledger` entry is written by a Cloud Function
   triggered by an *approved* completion — so a kid can't grant themselves stars.
3. **Parent "chore completed" push.** A Cloud Function on completion-create.

---

## Roadmap (rough order)

1. **Firebase wiring** — replace the action bodies in `store.tsx` with Firestore
   reads/writes; parent email/password auth.
2. **Server-authoritative Cloud Functions** — the free-for-all claim, awarding
   stars on approval, and the "chore completed" push.
3. **Camera capture** — `expo-camera` `CameraView` (camera only), uploaded to
   Firebase Storage.
4. **New-chore calendar UI** and the **child-detail** screen.
5. **Kid PIN login**, deadline **local notifications**, recurring-occurrence
   generation, dark mode.
6. **Privacy / compliance** (see below) before any store submission.

---

## Owner's responsibilities (the agent cannot do these)

- **Create the Firebase project and paste its secret keys** into `firebase.ts`
  (or, better, env vars). This is credential/account territory.
- **The live on-device test** — only the owner has the phone.

---

## Privacy & compliance

This is a children's app, so it falls under **COPPA (US)** and the **UK Age
Appropriate Design Code**. Plan for parental consent and sensible data handling
before any app-store submission. Note: completion photos are intended to be of
*objects* (an empty dishwasher, a clean bedroom, finished homework), not children
— but the compliance obligations of a kids' app still apply. Keep this in mind
when designing data storage and retention; don't treat it as an afterthought.
