import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cities, contracts, sectors, roles, taskTypes] = await Promise.all([
      prisma.city.findMany({
        include: { neighborhoods: true },
        orderBy: { name: "asc" },
      }),
      prisma.contract.findMany({ orderBy: { name: "asc" } }),
      prisma.sector.findMany({ orderBy: { name: "asc" } }),
      prisma.role.findMany({ orderBy: { name: "asc" } }),
      prisma.taskType.findMany({ orderBy: { name: "asc" } }),
    ]);

    console.log(
      `[API Lookups] Found ${contracts.length} contracts, ${cities.length} cities`,
    );

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
      sectors: sectors, // Returns {id, name}
      roles: roles, // Returns {id, name}
      task_types: taskTypes, // Returns {id, name, sector_id}
    });
  } catch (error) {
    console.error("Error fetching lookups:", error);
    return NextResponse.json(
      { error: "Failed to fetch lookups" },
      { status: 500 },
    );
  }
}
