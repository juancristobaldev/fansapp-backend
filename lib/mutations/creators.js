const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();

module.exports = {
  createCreator: async (parent, args, context) => {
    const { country, city, address, zipCode, userId } = args.input;

    console.log(args.input);

    const response = await isAuth(
      async (user) => {
        console.log(user);
        const creator = await prisma.creator
          .create({
            data: args.input,
            include: {
              user: {
                include: {
                  creator: true,
                },
              },
            },
          })
          .catch((err) => console.error(err));

        console.log(creator);
        if (creator) {
          console.log(creator);
          return {
            success: true,
            errors: false,
          };
        }
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
    console.log(args.input);
    const input = { ...args.input };
    delete input.id;
    let errors = {};

    if (id) {
      console.log(id, input);
      if (country || city || address || zipCode || status) {
        const creator = await prisma.creator
          .update({
            where: {
              userId: args.input.id,
            },
            data: {
              ...input,
            },
          })
          .catch((error) => (errors.prisma = error));
        console.log(creator);
        if (JSON.stringify({}) === JSON.stringify(errors)) {
          return {
            errors: false,
            success: true,
            creator: creator,
          };
        }
      } else errors.noFieldUpdate = true;
    } else errors.noUserId = true;

    return {
      errors: JSON.stringify(errors),
      success: false,
      creator: false,
    };
  },
  updateDetailsCreator: async (parent, args, context) => {
    const {
      userId,
      creatorId,
      suscription,
      paidMessage,
      title,
      description,
      suscriptionFree,
      messageFree,
    } = args.input;

    console.log("updatedetails");

    if (!userId || !creatorId)
      return {
        errors: "userID and creatorID is required",
        success: false,
      };
    if (!suscription && !paidMessage && !title && !description)
      return {
        errors: "you must update some field",
        success: false,
      };

    let fields = { ...args.input };

    delete fields.userId;
    delete fields.creatorId;
    delete fields.messageFree;
    delete fields.suscriptionFree;

    if (!suscription) delete fields.suscription;
    if (!title) delete fields.title;
    if (!description) delete fields.description;
    if (!paidMessage) delete fields.paidMessage;

    if (suscriptionFree) fields.suscription = 0;
    if (messageFree) fields.paidMessage = 0;

    console.log("FIELDS", fields);

    const response = await isAuth(
      async (user) => {
        console.log(user);
        let error = false;

        details = await prisma.creator
          .update({
            where: {
              id: creatorId,
            },
            data: {
              status: "creator",
              details: {
                upsert: {
                  where: {
                    creatorId: creatorId,
                  },
                  update: {
                    ...fields,
                  },
                  create: { ...fields },
                },
              },
            },
            include: {
              details: true,
            },
          })
          .then((data) => {
            console.log(data.details);
            return data.details;
          })
          .catch((err) => {
            console.log(err);
            error = err;
          });

        if (!error) {
          return {
            errors: error,
            success: true,
            details: details,
          };
        } else return { errors: error, success: false };
      },
      (error) => ({ errors: error, success: false }),
      context,
      userId
    );

    return response;
  },
  saveCreator: async (parents, args, context) => {
    const response = await isAuth(
      async (user) => {
        let error;
        if (!args.input.userId && !args.input.creatorId)
          error = "USER ID AND CREATOR ID REQUIRED";
        else {
          const bookmarkers = await prisma.bookmarkers.findMany({
            where: {
              usersId: user.id,
              creatorId: args.input.creatorId,
            },
          });

          if (bookmarkers.length) {
            await prisma.bookmarkers.delete({
              where: {
                id: bookmarkers[0].id,
              },
            });

            return {
              errors: error,
              success: true,
            };
          } else {
            await prisma.bookmarkers
              .create({
                data: {
                  usersId: user.id,
                  creatorId: args.input.creatorId,
                },
                include: {
                  creator: {
                    include: {
                      user: {
                        include: {
                          profile: true,
                        },
                      },
                    },
                  },
                },
              })
              .catch((error) => (error = error));

            return {
              errors: error,
              success: true,
            };
          }

          if (!error) {
            return {
              errors: error,
              success: true,
              bookmarker: bookmarker,
            };
          } else return { errors: error, success: false };
        }
      },
      (error) => ({ errors: error, success: false }),
      context,
      args.input.userId
    );

    return response;
  },
};
