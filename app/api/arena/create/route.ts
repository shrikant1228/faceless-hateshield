import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { generateRoomCode } from "@/lib/roomCode";

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Arena name is required" }, { status: 400 });
  }

  // Retry on the (very unlikely) chance of a room code collision
  let arena = null;
  for (let attempt = 0; attempt < 5 && !arena; attempt++) {
    const code = generateRoomCode();
    try {
      arena = await prisma.$transaction(async (tx) => {
        const created = await tx.arena.create({
          data: {
            name: name.trim(),
            code,
            masterId: user.userId,
            nextPlayerNumber: 2, // master takes #1
          },
        });
        await tx.arenaMember.create({
          data: {
            arenaId: created.id,
            userId: user.userId,
            playerNumber: 1,
            isMaster: true,
          },
        });
        return created;
      });
    } catch (err: any) {
      if (err.code === "P2002") continue; // unique constraint on code, retry
      throw err;
    }
  }

  if (!arena) {
    return NextResponse.json({ error: "Could not generate a unique room code, try again" }, { status: 500 });
  }

  return NextResponse.json({ id: arena.id, name: arena.name, code: arena.code });
}
