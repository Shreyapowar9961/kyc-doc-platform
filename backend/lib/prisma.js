const { PrismaClient } = require("@prisma/client");

// One shared Prisma client for the whole backend.
const prisma = new PrismaClient();

module.exports = prisma;
