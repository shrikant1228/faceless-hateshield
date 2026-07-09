import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { code } = await req.json();
  if (!code || !code.trim()) {
    return NextResponse.json({ error: "Room code is required" }, { status: 400 });
  }

  const arena = await prisma.arena.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!arena) {
    return NextResponse.json({ error: "No arena found with that code" }, { status: 404 });
  }

  const existing = await prisma.arenaMember.findUnique({
    where: { arenaId_userId: { arenaId: arena.id, userId: user.userId } },
  });

  if (existing) {
    if (existing.status === "BANNED") {
      return NextResponse.json({ error: "You are banned from this arena" }, { status: 403 });
    }
    if (existing.status === "EXITED") {
      // Re-activate them under their SAME player number — identity persists per arena
      await prisma.arenaMember.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
    }
    return NextResponse.json({ code: arena.code, playerNumber: existing.playerNumber });
  }

  const member = await prisma.$transaction(async (tx) => {
    const updatedArena = await tx.arena.update({
      where: { id: arena.id },
      data: { nextPlayerNumber: { increment: 1 } },
    });
    return tx.arenaMember.create({
      data: {
        arenaId: arena.id,
        userId: user.userId,
        playerNumber: updatedArena.nextPlayerNumber - 1,
      },
    });
  });

  return NextResponse.json({ code: arena.code, playerNumber: member.playerNumber });
}
