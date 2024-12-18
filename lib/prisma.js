const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const executePrisma = async (operation) => {
  try {
    console.log("start operation...");
    return await operation();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

module.exports = {
  usePrisma: prisma,
  executePrisma,
};
