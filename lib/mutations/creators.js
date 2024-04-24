const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();
const FlowApi = require("flowcl-node-api-client");

const flowApi = new FlowApi({
  apiKey: process.env.API_KEY_FLOW,
  secretKey: process.env.SECRET_KEY_FLOW,
  apiURL: process.env.API_URL_SANDBOX_FLOW,
});

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
        let error = false,
          details = false;

        console.log(process.env.API_URL_SANDBOX_FLOW);

        const keys = Object.keys(fields);

        data = {};

        if (keys.length) {
          const creator = await prisma.creator.findFirst({
            where: {
              userId,
            },
            include: {
              details: true,
            },
          });

          let sameObject = { ...fields };

          keys.forEach((key) => {
            if (fields[key] !== creator.details[key]) sameObject[key] = false;
            else {
              delete fields[key];
              sameObject[key] = true;
            }
          });

          console.log(
            "sameobject",
            Object.values(sameObject).find((value) => value == false)
          );

          if (
            Object.values(sameObject).find((value) => value == false) === false
          ) {
            if (!sameObject.suscription) {
              if (!creator.details.planIdMonth) {
                const serviceName = "plans/create";

                const params = {
                  planId: Math.random().toString(36).substring(7),
                  name: `Suscripcion mensual a ${user.username}`,
                  amount: fields.suscription,
                  interval: 3,
                };

                let response = await flowApi.send(serviceName, params, "POST");

                if (response.status === 1) fields.planIdMonth = response.planId;
              } else
                await flowApi.send(
                  "plans/edit",
                  {
                    planId: creator.details.planIdMonth,
                    name: `Suscripcion mensual a ${user.username}`,
                    amount: fields.suscription,
                  },
                  "POST"
                );

              if (!creator.details.planIdYear) {
                const serviceName = "plans/create";

                const params = {
                  planId: Math.random().toString(36).substring(7),
                  name: `Suscripcion anual a ${user.username}`,
                  amount: creator.details.suscription,
                  interval: 4,
                };

                let response = await flowApi.send(serviceName, params, "POST");

                if (response.status === 1) fields.planIdYear = response.planId;
              } else
                await flowApi.send(
                  "plans/edit",
                  {
                    planId: creator.details.planIdMonth,
                    amount: fields.suscription,
                  },
                  "POST"
                );
            }

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

            console.log(details);
          } else error = "new fields same old fields";

          if (!error && details) {
            return {
              success: true,
              errors: false,
              details: details,
            };
          }

          return {
            success: false,
            errors: error,
          };
        }
      },
      (error) => ({ errors: error, success: false }),
      context,
      userId
    );
    console.log(response);
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
