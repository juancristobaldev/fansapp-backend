const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const isExist = async (schema, field, value) => {
  const isExist = await prisma[schema].findMany({
    where: {
      [field]: value,
    },
  });

  if (isExist.length) return true;
  else return false;
};

module.exports = isExist;
