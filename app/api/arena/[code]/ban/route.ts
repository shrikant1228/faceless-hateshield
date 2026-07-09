import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { playerNumber } = await req.json();

  const arena = await prisma.arena.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!arena) return NextResponse.json({ error: "Arena not found" }, { status: 404 });

  const requester = await prisma.arenaMember.findUnique({
    where: { arenaId_userId: { arenaId: arena.id, userId: user.userId } },
  });
  if (!requester?.isMaster) {
    return NextResponse.json({ error: "Only the master can ban players" }, { status: 403 });
  }
  if (playerNumber === requester.playerNumber) {
    return NextResponse.json({ error: "The master cannot ban themselves" }, { status: 400 });
  }

  const target = await prisma.arenaMember.findUnique({
    where: { arenaId_playerNumber: { arenaId: arena.id, playerNumber } },
  });
  if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  await prisma.arenaMember.update({ where: { id: target.id }, data: { status: "BANNED" } });

  return NextResponse.json({ ok: true, bannedPlayerNumber: playerNumber });
}
