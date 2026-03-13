import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing Lookups Queries...')
  try {
    console.log('Testing City...')
    const cities = await prisma.city.findMany({
      include: { neighborhoods: true },
      orderBy: { name: "asc" },
    })
    console.log(`Success: Found ${cities.length} cities`)

    console.log('Testing Contract...')
    const contracts = await prisma.contract.findMany({ orderBy: { name: "asc" } })
    console.log(`Success: Found ${contracts.length} contracts`)

    console.log('Testing Sector...')
    const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } })
    console.log(`Success: Found ${sectors.length} sectors`)

    console.log('Testing Role...')
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } })
    console.log(`Success: Found ${roles.length} roles`)

    console.log('Testing TaskType...')
    const taskTypes = await prisma.taskType.findMany({ orderBy: { name: "asc" } })
    console.log(`Success: Found ${taskTypes.length} taskTypes`)

  } catch (e) {
    console.error('ERROR in Prisma query:')
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
