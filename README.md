# Faceless

Anonymous group chat. You create an **arena**, get a PUBG/Free Fire-style **room code**,
share it, and anyone who joins becomes a fixed `PLAYER#042` — no name, no profile —
until they leave or get banned. **HateShield** scores every message with a pretrained
NLP toxicity model and blurs anything abusive, striking the sender. Three strikes = banned.

## What's built

- **Auth**: email/password, JWT in an httpOnly cookie
- **Arenas**: create (you become MASTER), join by code, roster view for the master
- **Player identity**: auto-assigned `PLAYER#N`, persists per-arena until exit/ban
- **Real-time chat**: Socket.IO over a custom Next.js server
- **HateShield**: `@tensorflow-models/toxicity` (pretrained on the Jigsaw toxic-comments
  dataset — same lineage as Google's Perspective API) scores every message across 7
  categories (toxicity, insult, threat, identity_attack, obscene, sexual_explicit,
  severe_toxicity). Flagged messages are stored blurred, the sender gets a strike,
  and the 3rd strike auto-bans them from that arena.
- **Master controls**: manual ban from the roster sidebar

## Why a pretrained model, not one I "trained for you"

Training a toxicity classifier from scratch needs thousands of labeled toxic /
non-toxic examples and real compute — not something producible in a chat session.
The pretrained model here is a legitimate, widely-used NLP toxicity classifier, not
a keyword blocklist. If down the line you collect real moderation data from your own
users (flagged messages + human review decisions), that data is exactly what you'd
use to fine-tune something more tailored later.

## Setup (run these in your own VS Code terminal — my sandbox has no internet access
## so I couldn't install packages or test-run this myself)

1. **Copy this folder** into your `vscode-projects` directory, e.g.
   `C:\Users\shrik\OneDrive\Documents\vscode-projects\faceless`

2. **Install PostgreSQL** if you don't have it (or use a free hosted one like
   [Neon](https://neon.tech) or [Supabase](https://supabase.com) — either works, just
   copy the connection string).

3. **Install dependencies**:
   ```bash
   cd faceless
   npm install
   ```

4. **Configure environment**:
   ```bash
   copy .env.example .env
   ```
   Then edit `.env`:
   - `DATABASE_URL` — your Postgres connection string
   - `JWT_SECRET` — any long random string
   - `TOXICITY_THRESHOLD` — 0.85 is a solid default (higher = stricter to flag)

5. **Create the database tables**:
   ```bash
   npm run prisma:migrate
   ```

6. **Run it**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. First message you send will take a couple seconds
   extra — that's HateShield's model warming up in the background.

## Project structure

```
app/
  page.tsx                  landing page
  (auth)/login, register    auth pages
  dashboard/                create/join arena, list your arenas
  arena/[code]/             the live chat room
  api/
    auth/...                register, login, logout, me
    arena/...                create, join, [code], mine, [code]/ban, [code]/exit
lib/
  prisma.ts                 db client
  auth.ts                   password hashing, JWT
  roomCode.ts                room code generator
  moderation.ts              HateShield (used by server.js at runtime)
prisma/schema.prisma        User, Arena, ArenaMember, Message
server.js                   custom server: Next.js + Socket.IO + HateShield enforcement
```

## Things you'll probably want to add next

- Rate limiting on message sending (currently unlimited)
- Email verification
- Arena deletion (currently only the master can't exit, but can't delete either)
- Push/browser notifications for new messages when the tab isn't focused
- A way for the master to un-ban someone
- Message pagination (currently loads the last 200 messages only)

These were left out to keep the first version buildable and testable in one pass —
happy to add any of them next.
