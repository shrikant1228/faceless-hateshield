import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find user with ALL fields
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        isAdmin: true
      }
    });
    
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    
    console.log("🔍 Admin login attempt:", {
      email: user.email,
      isAdmin: user.isAdmin
    });
    
    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Not authorized as admin" }, { status: 403 });
    }

    const token = signToken({ 
      userId: user.id, 
      email: user.email, 
      displayName: user.displayName 
    });

    const res = NextResponse.json({ 
      id: user.id, 
      email: user.email, 
      displayName: user.displayName,
      isAdmin: user.isAdmin 
    });
    
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    
    return res;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}