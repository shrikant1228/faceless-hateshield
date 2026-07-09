import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const arena = await prisma.arena.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!arena) return NextResponse.json({ error: "Arena not found" }, { status: 404 });

  const member = await prisma.arenaMember.findUnique({
    where: { arenaId_userId: { arenaId: arena.id, userId: user.userId } },
  });
  if (!member) return NextResponse.json({ error: "You are not a member of this arena" }, { status: 403 });
  if (member.status === "BANNED") {
    return NextResponse.json({ error: "You are banned from this arena" }, { status: 403 });
  }

  const [messages, members] = await Promise.all([
    prisma.message.findMany({
      where: { arenaId: arena.id },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { member: { select: { playerNumber: true } } },
    }),
    // Master gets a roster view (still by player number only — never real names)
    member.isMaster
      ? prisma.arenaMember.findMany({
          where: { arenaId: arena.id },
          select: { id: true, playerNumber: true, status: true, strikes: true, isMaster: true },
          orderBy: { playerNumber: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    arena: { id: arena.id, name: arena.name, code: arena.code },
    self: { playerNumber: member.playerNumber, isMaster: member.isMaster, strikes: member.strikes },
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      isBlurred: m.isBlurred,
      playerNumber: m.member.playerNumber,
      createdAt: m.createdAt,
    })),
    members,
  });
}
