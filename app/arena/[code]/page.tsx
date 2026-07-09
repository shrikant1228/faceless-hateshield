"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  content: string | null;
  imageUrl: string | null;
  isBlurred: boolean;
  playerNumber: number;
  createdAt: string;
  isOwnMessage?: boolean;
  isMasterView?: boolean;
}

interface Member {
  id: string;
  playerNumber: number;
  status: "ACTIVE" | "BANNED" | "EXITED";
  strikes: number;
  isMaster: boolean;
}

export default function ArenaPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [arenaName, setArenaName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [self, setSelf] = useState<{ playerNumber: number; isMaster: boolean; strikes: number } | null>(null);
  const [input, setInput] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.user) {
        router.push("/login");
        return;
      }
      if (cancelled) return;

      const arenaRes = await fetch(`/api/arena/${code}`);
      const arenaData = await arenaRes.json();
      if (!arenaRes.ok) {
        setFatalError(arenaData.error || "Could not load arena");
        return;
      }
      if (cancelled) return;

      setArenaName(arenaData.arena.name);
      setMessages(arenaData.messages);
      setMembers(arenaData.members || []);
      setSelf(arenaData.self);

      socket = io({ path: "/api/socket", auth: { token: me.socketToken } });

      if (cancelled) {
        socket.disconnect();
        return;
      }

      socketRef.current = socket;

      socket.on("connect", () => {
        socket!.emit("arena:join", { arenaCode: code }, (ack: any) => {
          if (!ack.ok) {
            setFatalError(ack.error);
            return;
          }
          setConnected(true);
        });
      });

      socket.on("message:new", (msg: ChatMessage) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      });

      socket.on(
        "message:updated",
        (update: { id: string; content: string | null; imageUrl: string | null; isBlurred: boolean }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === update.id
                ? { ...m, content: update.content, imageUrl: update.imageUrl, isBlurred: update.isBlurred }
                : m
            )
          );
        }
      );

      socket.on("hateshield:warning", (data: { 
        strikes: number; 
        maxStrikes: number; 
        banned: boolean;
        severity?: string;
        message?: string;
        labels?: string[];
      }) => {
        if (data.banned) {
          setFatalError("You've been banned from this arena by HateShield after 3 strikes.");
        } else if (data.severity === "severe") {
          setWarning(
            `⚠️ Your message was blurred! (Strikes: ${data.strikes}/${data.maxStrikes})`
          );
          setTimeout(() => setWarning(null), 6000);
        } else if (data.severity === "mild") {
          setWarning(
            `💬 ${data.message || "Please keep the chat respectful!"}`
          );
          setTimeout(() => setWarning(null), 4000);
        } else {
          setWarning(
            `HateShield flagged that message. Strike ${data.strikes}/${data.maxStrikes} — one more and you're banned.`
          );
          setTimeout(() => setWarning(null), 6000);
        }
      });

      socket.on("member:banned", ({ playerNumber }: { playerNumber: number }) => {
        setMembers((prev) => prev.map((m) => (m.playerNumber === playerNumber ? { ...m, status: "BANNED" } : m)));
      });

      socket.on("fatal:banned", () => {
        setFatalError("You've been banned from this arena by the Master.");
      });

      socket.on("connect_error", () => {
        setFatalError("Could not connect to the arena. Try refreshing.");
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("message:send", { content: input }, (ack: any) => {
      if (!ack.ok) setWarning(ack.error);
    });
    setInput("");
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !socketRef.current) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setWarning(data.error || "Image upload failed");
        return;
      }

      socketRef.current.emit("message:send", { content: "", imageUrl: data.url }, (ack: any) => {
        if (!ack.ok) setWarning(ack.error);
      });
    } catch (err) {
      setWarning("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function blurMessage(messageId: string) {
    if (!socketRef.current) return;
    if (!confirm("Blur this message for everyone (except you)?")) return;
    socketRef.current.emit("message:blur", { messageId }, (ack: any) => {
      if (!ack.ok) alert(ack.error || "Could not blur message");
    });
  }

  async function banPlayer(playerNumber: number) {
    if (!confirm(`Ban PLAYER#${playerNumber} from this arena?`)) return;
    const res = await fetch(`/api/arena/${code}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerNumber }),
    });
    const data = await res.json();
    if (res.ok) {
      setMembers((prev) => prev.map((m) => (m.playerNumber === playerNumber ? { ...m, status: "BANNED" } : m)));
    } else {
      alert(data.error);
    }
  }

  async function exitArena() {
    if (!confirm("Exit this arena? Your player tag will be freed up if you don't rejoin.")) return;
    await fetch(`/api/arena/${code}/exit`, { method: "POST" });
    router.push("/dashboard");
  }

  if (fatalError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-alert font-semibold mb-4">{fatalError}</p>
        <button onClick={() => router.push("/dashboard")} className="text-signal text-sm">
          ← back to dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Chat column */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-line px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{arenaName || "..."}</h1>
            <p className="player-tag text-xs text-muted mt-1">
              ROOM {code} — {connected ? <span className="text-signal">CONNECTED</span> : "CONNECTING..."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {self && (
              <span className="player-tag text-xs bg-panel border border-line rounded-full px-3 py-1">
                {self.isMaster ? "MASTER" : `PLAYER#${String(self.playerNumber).padStart(3, "0")}`}
                {self.strikes > 0 && <span className="text-alert"> · {self.strikes} strike{self.strikes > 1 ? "s" : ""}</span>}
              </span>
            )}
            {self && !self.isMaster && (
              <button onClick={exitArena} className="text-xs text-muted hover:text-alert transition">
                Exit
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 scanline">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isSelf={m.playerNumber === self?.playerNumber}
              isMaster={!!self?.isMaster}
              onBlur={() => blurMessage(m.id)}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {warning && (
          <div className="mx-6 mb-2 px-4 py-2 bg-alert/10 border border-alert text-alert text-sm rounded-md">
            {warning}
          </div>
        )}

        <form onSubmit={sendMessage} className="border-t border-line p-4 flex gap-3 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleImageSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload an image"
            className="shrink-0 bg-panel border border-line rounded-md px-3 py-3 text-sm hover:border-signal transition disabled:opacity-50"
          >
            {uploading ? "..." : "📷"}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something to the arena..."
            className="flex-1 bg-panel border border-line rounded-md px-4 py-3 outline-none focus:border-signal transition"
            maxLength={2000}
          />
          <button
            type="submit"
            className="bg-signal text-void font-semibold rounded-md px-6 py-3 hover:opacity-90 transition"
          >
            Send
          </button>
        </form>
      </div>

      {/* Master roster sidebar */}
      {self?.isMaster && (
        <aside className="w-full md:w-72 border-l border-line px-5 py-6">
          <h2 className="player-tag text-xs text-muted mb-4">ROSTER</h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border border-line rounded-md px-3 py-2 bg-panel"
              >
                <div>
                  <p className="player-tag text-sm">
                    {m.isMaster ? "MASTER" : `PLAYER#${String(m.playerNumber).padStart(3, "0")}`}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {m.status} {m.strikes > 0 && `· ${m.strikes} strikes`}
                  </p>
                </div>
                {!m.isMaster && m.status === "ACTIVE" && (
                  <button
                    onClick={() => banPlayer(m.playerNumber)}
                    className="text-xs text-alert hover:underline"
                  >
                    Ban
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
    </main>
  );
}

function MessageBubble({
  message,
  isSelf,
  isMaster,
  onBlur,
}: {
  message: ChatMessage;
  isSelf: boolean;
  isMaster: boolean;
  onBlur: () => void;
}) {
  const tag = `PLAYER#${String(message.playerNumber).padStart(3, "0")}`;
  
  // Check if this user can see the content
  const canSeeContent = !message.isBlurred || isSelf || isMaster;
  
  // Check if this is a blurred message that's hidden from this user
  const isHiddenFromViewer = message.isBlurred && !isSelf && !isMaster;
  
  // Can moderate if master and message is not already blurred
  const canModerate = isMaster && !message.isBlurred;

  return (
    <div className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
      <span className="player-tag text-[11px] text-muted mb-1">{tag}</span>
      <div className="flex items-end gap-2">
        <div
          className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
            isSelf ? "bg-signal/10 border border-signal/30" : "bg-panel border border-line"
          } ${isHiddenFromViewer ? "opacity-60" : ""}`}
        >
          {isHiddenFromViewer ? (
            // Hidden message - show placeholder
            <span className="text-muted italic">🚫 Message hidden</span>
          ) : (
            // Visible message (either not blurred, or sender/master viewing blurred)
            <>
              {message.isBlurred && (isSelf || isMaster) && (
                <span className="text-alert text-[11px] player-tag block mb-1">
                  ⚠ FLAGGED (visible to you only)
                </span>
              )}
              
              {message.imageUrl && canSeeContent && (
                <img
                  src={message.imageUrl}
                  alt="shared image"
                  className="max-w-full rounded-md mb-1"
                  style={{ maxHeight: "300px" }}
                />
              )}
              
              {message.content && canSeeContent && (
                <span>{message.content}</span>
              )}
              
              {message.isBlurred && (isSelf || isMaster) && (
                <p className="text-xs text-alert mt-1">
                  This message is hidden from other players
                </p>
              )}
            </>
          )}
        </div>
        {canModerate && (
          <button
            onClick={onBlur}
            title="Blur this message for everyone"
            className="text-[11px] player-tag text-muted hover:text-alert transition whitespace-nowrap"
          >
            Blur
          </button>
        )}
      </div>
    </div>
  );
}