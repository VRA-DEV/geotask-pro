import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Role: true,
        Sector: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Usuário desativado" },
        { status: 403 },
      );
    }

    // Support both bcrypt hashes and legacy plain text passwords
    let passwordValid = false;
    if (user.password_hash.startsWith("$2")) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy plain text — validate and upgrade to bcrypt
      passwordValid = user.password_hash === password;
      if (passwordValid) {
        const hash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password_hash: hash },
        });
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

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
      sector: user.Sector
        ? { name: user.Sector.name }
        : { name: "Sem Setor" },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
