import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-line">
        <span className="player-tag text-lg font-extrabold tracking-widest">
          FACE<span className="text-signal">LESS</span>
        </span>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-muted hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm bg-signal text-void font-semibold rounded-md hover:opacity-90 transition"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <span className="player-tag text-xs text-muted border border-line rounded-full px-3 py-1 mb-6">
          NO NAMES. NO PROFILES. JUST PLAYER TAGS.
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold max-w-3xl leading-tight">
          Group chats where nobody knows who's talking —
          <span className="text-signal"> except the mods.</span>
        </h1>
        <p className="text-muted max-w-xl mt-6 text-lg">
          Create an arena, get a room code, and everyone who joins becomes a player number.
          HateShield watches every message so anonymity never turns into abuse.
        </p>
        <div className="flex gap-4 mt-10">
          <Link
            href="/register"
            className="px-6 py-3 bg-signal text-void font-semibold rounded-md hover:opacity-90 transition"
          >
            Create your first arena
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-line rounded-md hover:border-muted transition"
          >
            I have a room code
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl w-full text-left">
          <Feature
            eyebrow="01 — ENTER"
            title="Room codes, not invites"
            body="Every arena gets a short code, like a lobby ID. Share it, and anyone can drop in."
          />
          <Feature
            eyebrow="02 — IDENTITY"
            title="You're PLAYER#042"
            body="Your tag is fixed for that arena until you leave or get banned. No name, no photo, no history."
          />
          <Feature
            eyebrow="03 — SAFETY"
            title="HateShield, always on"
            body="Every message is scored in real time. Abusive messages get blurred and strike the sender — three strikes, banned."
          />
        </div>
      </section>

      <footer className="border-t border-line px-8 py-6 text-center text-xs text-muted player-tag">
        FACELESS © {new Date().getFullYear()} — SPEAK FREELY, NOT CRUELLY
        <br></br>
        created by <a href="https://www.instagram.com/shrikant_mathpati_1228?igsh=MWR0YzVucGsYXc3MA==">Shrikant_swami</a>
      </footer>
    </main>
  );
}

function Feature({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="border border-line rounded-lg p-6 bg-panel">
      <span className="player-tag text-xs text-signal">{eyebrow}</span>
      <h3 className="text-lg font-semibold mt-3">{title}</h3>
      <p className="text-muted text-sm mt-2">{body}</p>
    </div>
  );
}
