import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user)
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    if (!user.active)
      return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });

    const { password_hash: _, ...userWithoutPassword } = user;

    // Transform enum strings to objects for monolithic frontend compatibility
    return NextResponse.json({
      ...userWithoutPassword,
      role: { name: user.role },
      sector: { name: user.sector },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
