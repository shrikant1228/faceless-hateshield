import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { isAdmin: true }
  });
  
  if (!dbUser?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  const [totalUsers, totalArenas, totalMessages, bannedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.arena.count(),
    prisma.message.count(),
    prisma.arenaMember.count({ where: { status: "BANNED" } })
  ]);
  
  return NextResponse.json({
    totalUsers,
    totalArenas,
    totalMessages,
    bannedUsers
  });
}