import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const memberships = await prisma.arenaMember.findMany({
    where: { userId: user.userId, status: { in: ["ACTIVE"] } },
    include: { arena: { select: { id: true, name: true, code: true } } },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({
    arenas: memberships.map((m) => ({
      id: m.arena.id,
      name: m.arena.name,
      code: m.arena.code,
      playerNumber: m.playerNumber,
      isMaster: m.isMaster,
    })),
  });
}
