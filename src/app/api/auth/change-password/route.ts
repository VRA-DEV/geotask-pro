import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { userId, currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // If currentPassword is provided, validate it (user changing own password)
    if (currentPassword !== undefined && currentPassword !== null) {
      let valid = false;
      if (user.password_hash.startsWith("$2")) {
        valid = await bcrypt.compare(currentPassword, user.password_hash);
      } else {
        valid = user.password_hash === currentPassword;
      }
      if (!valid) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 401 },
        );
      }
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hash,
        must_change_password: false,
      },
    });

    logActivity(
      userId,
      user.name,
      "password_changed",
      "user",
      userId,
      "Alterou a senha",
    );

    return NextResponse.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return NextResponse.json(
      { error: "Erro interno ao alterar senha" },
      { status: 500 },
    );
  }
}
