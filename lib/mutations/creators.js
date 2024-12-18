const { usePrisma, executePrisma } = require("../prisma");
const prisma = usePrisma;

const isAuth = require("../isAuth");

module.exports = {
  createCreator: async (parent, args, context) => {
    const { country, city, address, zipCode, userId, dniFront, dniBack } =
      args.input;

    f;

    const response = await isAuth(
      async (user) => {
        const data = { ...args.input };
        delete data.userId;

        const creator = await executePrisma(
          async () =>
            await prisma.creator
              .findFirst({
                where: {
                  userId: userId,
                },
              })
              .then(async (creator) => {
                if (!creator) {
                  return await prisma.creator
                    .create({
                      data: { userId: userId },
                    })
                    .catch((err) => console.error(err));
                }
                return creator;
              })
        );

        const requests = await executePrisma(
          async () =>
            await prisma.requestCreator
              .findFirst({
                where: {
                  creatorId: creator.id,
                  OR: [{ status: "pending" }, { status: "approbed" }],
                },
              })
              .then(async (response) => {
                if (!response)
                  return await prisma.requestCreator
                    .create({
                      data: {
                        creatorId: creator.id,
                        ...data,
                      },
                    })
                    .catch((e) => console.log(e));
                return response;
              })
        );

        return {
          success: true,
          errors: false,
          user: {
            ...user,
            creator: {
              ...creator,
              request: [requests],
            },
          },
        };
      },
      (error) => ({
        errors: `${error}`,
        success: false,
      }),
      context,
      userId
    );

    return response;
  },

  updateCreator: async (parent, args, context) => {
    const { country, city, address, zipCode, id, status } = args.input;

    const input = { ...args.input };
    delete input.id;

    if (!id || (!country && !city && !address && !zipCode && !status))
      return {
        errors: "id and one field required",
      };

    const creator = await executePrisma(
      async () =>
        await prisma.creator.update({
          where: {
            userId: args.input.id,
          },
          data: {
            ...input,
          },
        })
    );

    return {
      errors: false,
      success: true,
      creator: creator,
    };
  },

  saveCreator: async (parents, args, context) => {
    const response = await isAuth(
      async (user) => {
        if (!args.input.userId || !args.input.creatorId)
          return {
            errors: "userId and creatorId is required",
          };

        const bookmarkers = await executePrisma(
          async () =>
            await prisma.bookmarker.findMany({
              where: {
                usersId: user.id,
              },
            })
        );

        const indexBookmark = bookmarkers.findIndex(
          (item) =>
            item.usersId === user.id && item.creatorId === args.input.creatorId
        );

        if (indexBookmark >= 0) {
          await executePrisma(
            async () =>
              await prisma.bookmarker.delete({
                where: {
                  id: bookmarkers[indexBookmark].id,
                },
              })
          );
          bookmarkers.splice(indexBookmark, 1);
        } else {
          const bookmarker = await executePrisma(
            async () =>
              await prisma.bookmarker.create({
                data: {
                  usersId: user.id,
                  creatorId: args.input.creatorId,
                },
              })
          );

          bookmarkers.push(bookmarker);
        }

        return {
          user: {
            bookmarkers: bookmarkers,
          },
          errors: errors,
          success: true,
        };
      },
      (errors) => ({ errors: errors, success: false }),
      context,
      args.input.userId
    );

    return response;
  },
  deleteCreator: async (parents, args, context) => {
    if (!args.input.creatorId && !args.input.userId)
      return {
        errors: "creator id and user id is required",
        success: false,
      };

    return isAuth(
      async (user) => {
        await executePrisma(
          async () =>
            await prisma.creator.delete({
              where: {
                id: args.creatorId,
              },
            })
        );
        return {
          success: true,
          errors: false,
        };
      },
      (e) => {
        console.error(e);
        return {
          success: false,
          errors: e,
        };
      },
      context,
      args.input.userId,
      true,
      "admin"
    );
  },
};
