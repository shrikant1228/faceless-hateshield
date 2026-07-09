import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const playerNumber = body?.playerNumber;
  if (typeof playerNumber !== "number") {
    return NextResponse.json({ error: "playerNumber is required" }, { status: 400 });
  }

  const arena = await prisma.arena.findUnique({ where: { code: params.code } });
  if (!arena) {
    return NextResponse.json({ error: "Arena not found" }, { status: 404 });
  }

  const requester = await prisma.arenaMember.findUnique({
    where: { arenaId_userId: { arenaId: arena.id, userId: user.userId } },
  });
  if (!requester || !requester.isMaster) {
    return NextResponse.json({ error: "Only the Master can ban players" }, { status: 403 });
  }

  const target = await prisma.arenaMember.findUnique({
    where: { arenaId_playerNumber: { arenaId: arena.id, playerNumber } },
  });
  if (!target) {
    return NextResponse.json({ error: "Player not found in this arena" }, { status: 404 });
  }
  if (target.isMaster) {
    return NextResponse.json({ error: "The Master cannot be banned" }, { status: 400 });
  }
  if (target.status === "BANNED") {
    return NextResponse.json({ ok: true });
  }

  await prisma.arenaMember.update({
    where: { id: target.id },
    data: { status: "BANNED" },
  });

  const io = (global as any).io;
  if (io) {
    io.to(arena.id).emit("member:banned", { playerNumber });

    const sockets = await io.in(arena.id).fetchSockets();
    for (const s of sockets) {
      if (s.data.memberId === target.id) {
        s.emit("fatal:banned");
        s.leave(arena.id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}