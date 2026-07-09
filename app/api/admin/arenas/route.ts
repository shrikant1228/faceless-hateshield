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
  
  // ✅ FIXED: prisma.arena (singular) not prisma.arenas (plural)
  const arenas = await prisma.arena.findMany({
    include: {
      members: true,
      messages: {
        take: 10,
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  
  return NextResponse.json({ arenas });
}