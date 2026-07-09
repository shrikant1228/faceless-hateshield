"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="player-tag text-sm text-muted hover:text-white">
          ← back
        </Link>
        <h1 className="text-2xl font-bold mt-6 mb-1">Create your account</h1>
        <p className="text-muted text-sm mb-8">
          This is your login only — inside arenas, you're always a player number.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Shrikant" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />

          {error && <p className="text-alert text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-signal text-void font-semibold rounded-md py-3 hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-signal">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel border border-line rounded-md px-4 py-3 outline-none focus:border-signal transition"
      />
    </label>
  );
}
