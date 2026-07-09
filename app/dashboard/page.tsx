"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ArenaSummary {
  id: string;
  name: string;
  code: string;
  playerNumber: number;
  isMaster: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [arenas, setArenas] = useState<ArenaSummary[] | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [newArenaName, setNewArenaName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.push("/login");
        return;
      }
      setDisplayName(me.user.displayName);
      const list = await fetch("/api/arena/mine").then((r) => r.json());
      setArenas(list.arenas || []);
    })();
  }, [router]);

  async function createArena(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/arena/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newArenaName }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    router.push(`/arena/${data.code}`);
  }

  async function joinArena(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/arena/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    router.push(`/arena/${data.code}`);
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div>
          <span className="player-tag text-lg font-extrabold tracking-widest">
            FACE<span className="text-signal">LESS</span>
          </span>
          <p className="text-muted text-sm mt-1">Signed in as {displayName || "..."}</p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
          }}
          className="text-sm text-muted hover:text-white transition"
        >
          Log out
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <form onSubmit={createArena} className="border border-line bg-panel rounded-lg p-6">
          <h2 className="font-semibold mb-1">Create an arena</h2>
          <p className="text-muted text-sm mb-4">You become the master. You'll get a room code to share.</p>
          <input
            required
            value={newArenaName}
            onChange={(e) => setNewArenaName(e.target.value)}
            placeholder="Arena name, e.g. Late Night Crew"
            className="w-full bg-void border border-line rounded-md px-4 py-3 outline-none focus:border-signal transition mb-3"
          />
          <button
            disabled={busy}
            className="w-full bg-signal text-void font-semibold rounded-md py-3 hover:opacity-90 transition disabled:opacity-50"
          >
            Create arena
          </button>
        </form>

        <form onSubmit={joinArena} className="border border-line bg-panel rounded-lg p-6">
          <h2 className="font-semibold mb-1">Join with a code</h2>
          <p className="text-muted text-sm mb-4">Enter the room code you were given, PUBG-lobby style.</p>
          <input
            required
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7K2P9X"
            maxLength={8}
            className="player-tag w-full bg-void border border-line rounded-md px-4 py-3 outline-none focus:border-signal transition mb-3 tracking-[0.3em] text-center text-lg"
          />
          <button
            disabled={busy}
            className="w-full border border-line rounded-md py-3 hover:border-signal transition disabled:opacity-50"
          >
            Enter arena
          </button>
        </form>
      </div>

      {error && <p className="text-alert text-sm mb-6">{error}</p>}

      <h2 className="font-semibold mb-4">Your arenas</h2>
      {arenas === null && <p className="text-muted text-sm">Loading...</p>}
      {arenas?.length === 0 && (
        <p className="text-muted text-sm">You haven't entered any arenas yet.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {arenas?.map((a) => (
          <Link
            key={a.id}
            href={`/arena/${a.code}`}
            className="border border-line bg-panel rounded-lg p-5 hover:border-signal transition flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{a.name}</p>
              <p className="player-tag text-xs text-muted mt-1">CODE: {a.code}</p>
            </div>
            <span className="player-tag text-xs bg-void border border-line rounded-full px-3 py-1">
              {a.isMaster ? "MASTER" : `PLAYER#${String(a.playerNumber).padStart(3, "0")}`}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
