const { usePrisma } = require("../prisma");

const prisma = usePrisma;
module.exports = {
  getHashtagsPopulars: async (parent, args, context) => {
    const hashtags = await prisma.hashtag.findMany({
      select: {
        id: true,
        hashtag: true,
      },
      orderBy: {
        profiles: {
          _count: "desc",
        },
      },
      skip: 0,
      take: 6,
    });

    return hashtags;
  },
};
