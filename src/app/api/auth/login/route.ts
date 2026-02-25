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
      include: {
        Role: true,
        Sector: true,
      },
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

    // Return user without password and with formatted role/sector
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      sector_id: user.sector_id,
      avatar: user.avatar,
      active: user.active,
      must_change_password: user.must_change_password,
      created_at: user.created_at,
      role: user.Role ? { name: user.Role.name } : { name: "Sem Cargo" },
      sector: user.Sector ? { name: user.Sector.name } : { name: "Sem Setor" },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
