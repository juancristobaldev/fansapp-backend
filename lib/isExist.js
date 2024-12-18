const { usePrisma } = require("./prisma");
const prisma = usePrisma;

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
