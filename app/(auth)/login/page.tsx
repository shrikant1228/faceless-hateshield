"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const endpoint = isAdminLogin ? "/api/auth/admin-login" : "/api/auth/login";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      
      // ALWAYS redirect to admin if it's admin login
      if (isAdminLogin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-muted hover:text-white">
          ← back
        </Link>
        <h1 className="text-2xl font-bold mt-6 mb-1">Welcome back</h1>
        <p className="text-muted text-sm mb-8">Log in, then join an arena with your room code.</p>

        {/* Admin/User toggle */}
        <div className="flex gap-2 mb-4 bg-panel border border-line rounded-md p-1">
          <button
            type="button"
            onClick={() => setIsAdminLogin(false)}
            className={`flex-1 text-xs py-2 rounded transition ${
              !isAdminLogin 
                ? "bg-signal text-void font-semibold" 
                : "text-muted hover:text-white"
            }`}
          >
            👤 User
          </button>
          <button
            type="button"
            onClick={() => setIsAdminLogin(true)}
            className={`flex-1 text-xs py-2 rounded transition ${
              isAdminLogin 
                ? "bg-alert text-white font-semibold" 
                : "text-muted hover:text-white"
            }`}
          >
            🔐 Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-panel border border-line rounded-md px-4 py-3 outline-none focus:border-signal transition"
              placeholder="shrikantmathpati@gmail.com"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">Password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-panel border border-line rounded-md px-4 py-3 outline-none focus:border-signal transition"
            />
          </label>

          {error && <p className="text-alert text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 font-semibold rounded-md py-3 hover:opacity-90 transition disabled:opacity-50 ${
              isAdminLogin ? "bg-alert text-white" : "bg-signal text-void"
            }`}
          >
            {loading ? "Logging in..." : isAdminLogin ? "🔐 Admin Login" : "Log in"}
          </button>
        </form>

        <p className="text-muted text-sm mt-6">
          No account yet?{" "}
          <Link href="/register" className="text-signal">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}