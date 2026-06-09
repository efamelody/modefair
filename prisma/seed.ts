import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const menuItems = [
  { name: "Nasi Lemak Ayam Goreng", price: 14.5, category: "Mains" },
  { name: "Roti Canai", price: 3.0, category: "Mains" },
  { name: "Mee Goreng Mamak", price: 10.0, category: "Mains" },
  { name: "Nasi Goreng Pattaya", price: 12.0, category: "Mains" },
  { name: "Satay Ayam (10 Cucuk)", price: 15.0, category: "Mains" },
  { name: "Kopi O Ais", price: 3.5, category: "Drinks" },
  { name: "Teh Tarik", price: 3.0, category: "Drinks" },
  { name: "Milo Ais", price: 4.0, category: "Drinks" },
  { name: "Air Kosong", price: 1.0, category: "Drinks" },
  { name: "Telur Mata", price: 2.0, category: "Sides" },
  { name: "Keropok Lekor", price: 4.0, category: "Sides" },
  { name: "Acar Timun", price: 2.5, category: "Sides" },
];

const tables = [
  { tableNumber: "T01" },
  { tableNumber: "T02" },
  { tableNumber: "T03" },
  { tableNumber: "T04" },
  { tableNumber: "T05" },
  { tableNumber: "T06" },
  { tableNumber: "T07" },
  { tableNumber: "T08" },
  { tableNumber: "T09" },
  { tableNumber: "T10" },
];

async function seed() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.table.deleteMany();

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  for (const table of tables) {
    await prisma.table.create({ data: table });
  }

  console.log("Seed completed: menu items and tables created.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
