import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [cities, contracts] = await Promise.all([
      prisma.city.findMany({
        include: { neighborhoods: true },
        orderBy: { name: "asc" },
      }),
      prisma.contract.findMany({ orderBy: { name: "asc" } }),
    ]);

    const staticSectors = [
      "Administrativo",
      "Atendimento ao Cliente",
      "Atendimento Social",
      "Cadastro",
      "Controladoria",
      "Coordenação",
      "Engenharia",
      "Financeiro",
      "Gerência",
      "Reurb",
      "RH",
      "TI",
    ].map((name, index) => ({ id: name, name })); // Using name as ID for enum compatibility

    const staticRoles = [
      "Admin",
      "Gestor",
      "Coordenador",
      "Gerente",
      "Liderado",
    ].map((name) => ({ id: name, name }));

    const citiesNeighborhoods = cities.reduce(
      (acc, city) => {
        acc[city.name] = city.neighborhoods.map((n) => n.name).sort();
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return NextResponse.json({
      contracts: contracts.map((c) => c.name),
      cities_neighborhoods: citiesNeighborhoods,
      sectors: staticSectors,
      roles: staticRoles,
    });
  } catch (error) {
    console.error("Error fetching lookups:", error);
    return NextResponse.json(
      { error: "Failed to fetch lookups" },
      { status: 500 },
    );
  }
}
