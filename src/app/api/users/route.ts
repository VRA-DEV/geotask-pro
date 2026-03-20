import prisma from "@/lib/prisma";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Mudar@123";

// GET /api/users
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const u = await prisma.user.findUnique({
        where: { id: Number(id) },
        include: {
          Role: true,
          Sector: true,
          Team: true,
          user_sectors: { include: { sector: true } },
        },
      });
      if (!u) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      
      return NextResponse.json({
        ...u,
        password_hash: undefined,
        role: u.Role,
        sector: u.Sector,
        team: u.Team,
        user_sectors: u.user_sectors,
      });
    }

    const users = await prisma.user.findMany({
      include: {
        Role: true,
        Sector: true,
        Team: true,
        user_sectors: { include: { sector: true } },
      },
      orderBy: { name: "asc" },
    });

    const transformed = users.map((u) => ({
      ...u,
      password_hash: undefined,
      role: u.Role,
      sector: u.Sector,
      team: u.Team,
      user_sectors: u.user_sectors,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 },
    );
  }
}

// POST /api/users
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, role_id, sector_id, role, sector, avatar } =
      parsed.data;
    const finalRoleId = Number(role_id || role);
    const finalSectorId = Number(sector_id || sector);
    const teamId = (parsed.data as any).team_id
      ? Number((parsed.data as any).team_id)
      : null;

    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role_id: finalRoleId,
        sector_id: finalSectorId,
        team_id: teamId,
        avatar: avatar || initials,
        password_hash: hash,
        must_change_password: true,
        active: true,
      },
      include: { Role: true, Sector: true, Team: true },
    });

    return NextResponse.json(
      {
        ...user,
        password_hash: undefined,
        role: user.Role,
        sector: user.Sector,
        team: user.Team,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 },
    );
  }
}

// PATCH /api/users
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      id,
      role,
      sector,
      role_id,
      sector_id,
      password,
      resetPassword,
      ...data
    } = parsed.data;

    const updateData: Record<string, unknown> = { ...data };
    if (role || role_id) updateData.role_id = Number(role_id || role);
    if (sector || sector_id)
      updateData.sector_id = Number(sector_id || sector);
    if ((data as any).team_id !== undefined) {
      updateData.team_id = (data as any).team_id
        ? Number((data as any).team_id)
        : null;
    }

    if (resetPassword) {
      updateData.password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      updateData.must_change_password = true;
    } else if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.must_change_password = true;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { Role: true, Sector: true, Team: true, user_sectors: { include: { sector: true } } },
    });

    return NextResponse.json({
      ...user,
      password_hash: undefined,
      role: user.Role,
      sector: user.Sector,
      team: user.Team,
      user_sectors: user.user_sectors,
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 },
    );
  }
}

// DELETE /api/users — soft delete
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    await prisma.user.update({
      where: { id: Number(id) },
      data: { active: false },
    });

    return NextResponse.json({ message: "Usuário desativado" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao desativar usuário" },
      { status: 500 },
    );
  }
}
