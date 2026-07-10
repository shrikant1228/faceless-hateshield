import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { isAdmin: true }
    });
    
    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in admin/users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}