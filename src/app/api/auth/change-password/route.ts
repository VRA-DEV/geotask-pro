import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/auth/change-password
// Body: { userId, currentPassword, newPassword }
export async function POST(req: Request) {
  try {
    const { userId, currentPassword, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "userId e newPassword são obrigatórios" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // If currentPassword is provided, validate it (user changing own password)
    if (currentPassword !== undefined && currentPassword !== null) {
      if (user.password_hash !== currentPassword) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 401 },
        );
      }
    }

    await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        password_hash: newPassword,
        must_change_password: false,
      },
    });

    return NextResponse.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return NextResponse.json(
      { error: "Erro interno ao alterar senha" },
      { status: 500 },
    );
  }
}
