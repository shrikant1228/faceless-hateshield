import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const arena = await prisma.arena.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!arena) return NextResponse.json({ error: "Arena not found" }, { status: 404 });

  const member = await prisma.arenaMember.findUnique({
    where: { arenaId_userId: { arenaId: arena.id, userId: user.userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 404 });
  if (member.isMaster) {
    return NextResponse.json({ error: "The master cannot exit their own arena. Delete it instead." }, { status: 400 });
  }

  await prisma.arenaMember.update({ where: { id: member.id }, data: { status: "EXITED" } });
  return NextResponse.json({ ok: true });
}
