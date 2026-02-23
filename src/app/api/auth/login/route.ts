import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Usuário desativado" },
        { status: 403 },
      );
    }

    if (user.password_hash !== password) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const { password_hash, ...userWithoutPassword } = user;

    // Transform enum strings to objects for monolithic frontend compatibility
    return NextResponse.json({
      ...userWithoutPassword,
      role: { name: user.role },
      sector: { name: user.sector },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
