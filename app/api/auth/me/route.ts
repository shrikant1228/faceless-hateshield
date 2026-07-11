import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, COOKIE_NAME, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const socketToken = signToken({ 
      userId: user.id, 
      email: user.email, 
      displayName: user.displayName 
    });
    
    return NextResponse.json({ 
      user: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin
      }, 
      socketToken 
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}