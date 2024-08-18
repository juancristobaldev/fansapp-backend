const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();

module.exports = {
  createCreator: async (parent, args, context) => {
    const { country, city, address, zipCode, userId, dniFront, dniBack } =
      args.input;

    if (
      !country ||
      !city ||
      !address ||
      !zipCode ||
      !userId ||
      !dniFront ||
      !dniBack
    )
      return;

    const response = await isAuth(
      async (user) => {
        let creator = await prisma.creator.findFirst({
          where: {
            userId: userId,
          },
        });

        if (!creator) {
          creator = await prisma.creator
            .create({
              data: { userId: userId },
            })
            .catch((err) => console.error(err));
        }

        if (creator) {
          let data = { ...args.input };
          delete data.userId;

          let requests = await prisma.requestCreator.findFirst({
            where: {
              creatorId: creator.id,
              OR: [{ status: "pending" }, { status: "approbed" }],
            },
          });

          if (!requests) {
            requests = await prisma.requestCreator
              .create({
                data: {
                  creatorId: creator.id,
                  ...data,
                },
              })
              .catch((e) => console.log(e));
          }

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
  /*
{
  "data": {
    "searchUser": {
      "profiles": [
        {
          "id": 3,
          "user": {
            "id": 3,
            "username": "Isaac.Matrs",
            "token": "381af9c8-fd5c-44e4-ae9c-fd4d57af5828",
            "creator": {
              "id": 7,
              "status": "approbed",
              "plans": [
                {
                  "id": 4
                }
              ]
            }
          }
        },
        {
          "id": 5,
          "user": {
            "id": 5,
            "username": "juancristobaldeveloper",
            "token": "85051a6a-5de2-40bd-a39e-2517715e30fa",
            "creator": {
              "id": 5,
              "status": "creator",
              "plans": [
                {
                  "id": 3
                }
              ]
            }
          }
        },
        {
          "id": 2,
          "user": {
            "id": 2,
            "username": "Christianvilla",
            "token": "0f1b3550-bd16-47b3-8d60-20608efdc65b",
            "creator": {
              "id": 6,
              "status": "approbed",
              "plans": [
                {
                  "id": 5
                }
              ]
            }
          }
        },
        {
          "id": 7,
          "user": {
            "id": 7,
            "username": "Whxsain",
            "token": "b1f7bf51-7acf-4376-8650-572cd5e22689",
            "creator": {
              "id": 11,
              "status": "approbed",
              "plans": [
                {
                  "id": 8
                }
              ]
            }
          }
        },
        {
          "id": 6,
          "user": {
            "id": 6,
            "username": "jxvncri",
            "token": "c0258db6-b992-4770-ac37-39f614e02afb",
            "creator": {
              "id": 10,
              "status": "approbed",
              "plans": [
                {
                  "id": 6
                }
              ]
            }
          }
        },
        {
          "id": 4,
          "user": {
            "id": 4,
            "username": "Catastroffe",
            "token": "b654f0e4-a782-4c16-9451-4d2031ecd249",
            "creator": {
              "id": 8,
              "status": "approbed",
              "plans": [
                {
                  "id": 7
                }
              ]
            }
          }
        }
      ],
      "nProfiles": 5
    }
  }
}
  */
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

  saveCreator: async (parents, args, context) => {
    const response = await isAuth(
      async (user) => {
        let errors;
        if (!args.input.userId && !args.input.creatorId)
          errors = "USER ID AND CREATOR ID REQUIRED";
        else {
          let bookmarker = await prisma.bookmarkers.findFirst({
            where: {
              usersId: user.id,
              creatorId: args.input.creatorId,
            },
          });

          const bookmarkers = await prisma.bookmarkers.findMany({
            where: {
              usersId: user.id,
            },
          });

          if (bookmarker) {
            await prisma.bookmarkers.delete({
              where: {
                id: bookmarker.id,
              },
            });

            return {
              user: {
                bookmarkers: [...bookmarkers],
              },
              errors: errors,
              success: true,
            };
          } else {
            const bookmarker = await prisma.bookmarkers
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
              .catch((error) => {
                errors = error;
                console.log(error);
              });

            if (!errors) {
              return {
                errors: errors,
                success: true,
                user: {
                  id: user.id,
                  bookmarkers: [...bookmarkers, bookmarker],
                },
              };
            }

            return { errors: errors, success: false };
          }
        }
      },
      (errors) => ({ errors: errors, success: false }),
      context,
      args.input.userId
    );

    return response;
  },
  deleteCreator: async (parents, args, context) => {
    const errors = [];
    if (!args.creatorId)
      return {
        errors: JSON.stringify(["creator id required"]),
        success: false,
      };

    await prisma.creator
      .delete({
        where: {
          id: args.creatorId,
        },
      })
      .catch((error) => errors.push(error));

    if (errors.length)
      return {
        errors: JSON.stringify(errors),
        success: false,
      };

    return {
      errors: JSON.stringify([]),
      success: true,
    };
  },
};
