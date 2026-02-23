import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Dynamic sector mapping to handle various input formats
const SECTOR_MAP: Record<string, string> = {
  Administrativo: "Administrativo",
  "Atendimento ao Cliente": "AtendimentoAoCliente",
  "Atendimento Social": "AtendimentoSocial",
  Cadastro: "Cadastro",
  Controladoria: "Controladoria",
  Coordenação: "Coordenacao",
  Engenharia: "Engenharia",
  Financeiro: "Financeiro",
  Gerência: "Gerencia",
  Reurb: "Reurb",
  RH: "RH",
  TI: "TI",
  AtendimentoAoCliente: "AtendimentoAoCliente",
  AtendimentoSocial: "AtendimentoSocial",
  Coordenacao: "Coordenacao",
  Gerencia: "Gerencia",
};

const mapSector = (s: any): any => {
  const str = String(s);
  return SECTOR_MAP[str] || str;
};

// GET /api/users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
    });

    // Transform for frontend compatibility (monolith expects objects)
    const transformed = users.map((u: any) => ({
      ...u,
      role: { name: u.role },
      sector: { name: u.sector },
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
    const data = await req.json();
    const { name, email, role, sector, role_id, sector_id, avatar, password } =
      data;

    const finalRole = role || role_id;
    const finalSector = mapSector(sector || sector_id);

    if (!name || !email || !finalRole || !finalSector) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, email, role, sector" },
        { status: 400 },
      );
    }

    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const user: any = await prisma.user.create({
      data: {
        name,
        email,
        role: finalRole as any,
        sector: finalSector as any,
        avatar: avatar || initials,
        password_hash: password || "123456",
        must_change_password: true,
        active: true,
      },
    });

    return NextResponse.json(
      {
        ...user,
        role: { name: user.role },
        sector: { name: user.sector },
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
    const { id, role, sector, role_id, sector_id, password, ...data } = body;
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const updateData: any = { ...data };
    if (role || role_id) updateData.role = role || role_id;
    if (sector || sector_id) updateData.sector = mapSector(sector || sector_id);
    if (password) {
      updateData.password_hash = password;
      updateData.must_change_password = true;
    }

    const user: any = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json({
      ...user,
      role: { name: user.role },
      sector: { name: user.sector },
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 },
    );
  }
}

// DELETE /api/users
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
