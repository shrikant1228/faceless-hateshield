"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ============ Type Definitions ============
interface User {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string | Date;   // ✅ Accept both string and Date
}

interface Arena {
  id: string;
  name: string;
  code: string;
  createdAt: string | Date;
  members: any[];
  messages: any[];
}

// ============ Main Admin Page ============
export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArenas: 0,
    totalMessages: 0,
    bannedUsers: 0,
  });
  const [activeTab, setActiveTab] = useState<"users" | "arenas" | "stats">("stats");

  // ============ Auth Check ============
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        
        if (!data.user) {
          router.push("/login");
          return;
        }
        
        if (!data.user.isAdmin) {
          router.push("/dashboard");
          return;
        }
        
        setUser(data.user);
        await loadData();
        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      }
    }
    
    checkAuth();
  }, [router]);

  // ============ Load Data ============
  async function loadData() {
    try {
      const [usersRes, arenasRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/arenas"),
        fetch("/api/admin/stats"),
      ]);
      
      const usersData = await usersRes.json();
      const arenasData = await arenasRes.json();
      const statsData = await statsRes.json();
      
      setUsers(usersData.users || []);
      setArenas(arenasData.arenas || []);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  // ============ Helper: Format Date ============
  function formatDate(date: string | Date): string {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <p className="text-muted">Loading admin panel...</p>
      </div>
    );
  }

  // ============ Render ============
  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="border-b border-line bg-panel px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            <span className="text-signal">🗄️</span>
            <span className="text-sm font-mono ml-2 text-muted">Admin Panel</span>
          </h1>
          <p className="text-xs text-muted">Welcome, {user?.displayName}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard" className="text-muted hover:text-white text-sm">
            Dashboard
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
            className="text-sm text-alert hover:opacity-80"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Total Arenas" value={stats.totalArenas} />
        <StatCard title="Total Messages" value={stats.totalMessages} />
        <StatCard title="Banned Users" value={stats.bannedUsers} color="text-alert" />
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-line">
        <div className="flex gap-6">
          {["stats", "users", "arenas"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 px-1 text-sm border-b-2 transition ${
                activeTab === tab
                  ? "border-signal text-white"
                  : "border-transparent text-muted hover:text-white"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "stats" && <StatsView stats={stats} />}
        {activeTab === "users" && <UsersTable users={users} formatDate={formatDate} />}
        {activeTab === "arenas" && <ArenasTable arenas={arenas} formatDate={formatDate} />}
      </div>
    </div>
  );
}

// ============ Stat Card Component ============
function StatCard({ title, value, color = "text-white" }: { title: string; value: number; color?: string }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <p className="text-muted text-sm">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ============ Stats View ============
function StatsView({ stats }: { stats: any }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="font-semibold mb-3">Quick Stats</h3>
      <div className="space-y-2">
        <p className="text-sm"><span className="text-muted">Total Users:</span> {stats.totalUsers}</p>
        <p className="text-sm"><span className="text-muted">Total Arenas:</span> {stats.totalArenas}</p>
        <p className="text-sm"><span className="text-muted">Total Messages:</span> {stats.totalMessages}</p>
        <p className="text-sm"><span className="text-muted">Banned Users:</span> {stats.bannedUsers}</p>
      </div>
    </div>
  );
}

// ============ Users Table ============
function UsersTable({ users, formatDate }: { users: User[]; formatDate: (date: string | Date) => string }) {
  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-line bg-void">
          <tr>
            <th className="text-left p-3 text-xs text-muted">Display Name</th>
            <th className="text-left p-3 text-xs text-muted">Email</th>
            <th className="text-left p-3 text-xs text-muted">Role</th>
            <th className="text-left p-3 text-xs text-muted">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center p-6 text-muted">No users found</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b border-line/50 hover:bg-void/50">
                <td className="p-3 text-sm">{user.displayName}</td>
                <td className="p-3 text-sm text-muted">{user.email}</td>
                <td className="p-3 text-sm">
                  {user.isAdmin ? (
                    <span className="text-signal font-semibold">Admin</span>
                  ) : (
                    <span className="text-muted">User</span>
                  )}
                </td>
                <td className="p-3 text-sm text-muted">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============ Arenas Table ============
function ArenasTable({ arenas, formatDate }: { arenas: Arena[]; formatDate: (date: string | Date) => string }) {
  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-line bg-void">
          <tr>
            <th className="text-left p-3 text-xs text-muted">Name</th>
            <th className="text-left p-3 text-xs text-muted">Code</th>
            <th className="text-left p-3 text-xs text-muted">Members</th>
            <th className="text-left p-3 text-xs text-muted">Messages</th>
            <th className="text-left p-3 text-xs text-muted">Created</th>
          </tr>
        </thead>
        <tbody>
          {arenas.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center p-6 text-muted">No arenas found</td>
            </tr>
          ) : (
            arenas.map((arena) => (
              <tr key={arena.id} className="border-b border-line/50 hover:bg-void/50">
                <td className="p-3 text-sm">{arena.name}</td>
                <td className="p-3 text-sm player-tag text-signal font-mono">{arena.code}</td>
                <td className="p-3 text-sm text-muted">{arena.members?.length || 0}</td>
                <td className="p-3 text-sm text-muted">{arena.messages?.length || 0}</td>
                <td className="p-3 text-sm text-muted">
                  {formatDate(arena.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}