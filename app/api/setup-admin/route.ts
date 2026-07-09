import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// This is a one-time setup route to make your email an admin
// You can delete this after running it once
export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  
  // Use a secret key to prevent random people from making themselves admin
  const ADMIN_SETUP_SECRET = "faceless-admin-setup-2024";
  
  if (secret !== ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const adminEmail = "shrikantmathpati@gmail.com";
  
  const user = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (!user) {
    return NextResponse.json({ 
      error: "User not found. Please register first with shrikantmathpati@gmail.com" 
    }, { status: 404 });
  }
  
  await prisma.user.update({
    where: { email: adminEmail },
    data: { isAdmin: true }
  });
  
  return NextResponse.json({ 
    success: true, 
    message: `User ${adminEmail} is now an admin!` 
  });
}   