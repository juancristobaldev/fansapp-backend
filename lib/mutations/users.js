const Nope = require("nope-validator");
const { PrismaClient } = require("@prisma/client");
const { createUserSchema } = require("../schemas/nope");
const { encryptPassword } = require("../encryptPassword");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const { v4 } = require("uuid");
const isExist = require("../isExist");
const isAuth = require("../isAuth");

const FlowApi = require("flowcl-node-api-client");
const { updateCache } = require("../cache");
const flowApi = new FlowApi({
  apiKey: process.env.API_KEY_FLOW,
  secretKey: process.env.SECRET_KEY_FLOW,
  apiURL: process.env.API_URL_SANDBOX_FLOW,
});

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_PUBLIC_KEY,
    secretAccessKey: process.env.AWSSECRET_KEY,
  },
});

module.exports = {
  createUser: async (parent, args, context) => {
    const errors = {};
    const UserSchema = createUserSchema;

    const validate = UserSchema.validate(args.input);

    let user;
    if (validate)
      return {
        success: false,
        errors: JSON.stringify(validate),
      };
    else {
      console.log(args.input);

      const { password } = args.input;

      const bcryptPassword = await encryptPassword(password);

      const data = {
        ...args.input,
        password: bcryptPassword,
      };

      const isExistEmail = await isExist("user", "email", args.input.email),
        isExistUser = await isExist("user", "username", args.input.username);

      console.log(isExistEmail, isExistUser);

      if (isExistEmail || isExistUser) {
        errors.isExistEmail = isExistEmail ? true : false;
        errors.isExistUser = isExistUser ? true : false;
      } else {
        user = await prisma.user
          .create({
            data: {
              token: v4(),
              rol: "customer",
              notifications: {
                create: {
                  messages: true,
                  paidMessages: true,
                  comments: true,
                  donations: true,
                  suscriptors: true,
                  purchases: true,
                },
              },
              privacity: {
                create: {
                  profile: "all",
                  messages: "nobody",
                },
              },
              profile: {
                create: {
                  description: "¡Hola 👋!, soy nuevo en Peach's Hub 🍑❤️",
                },
              },
              ...data,
            },
          })
          .then(async (user) => {
            console.log(user);

            if (user) {
              let serviceNameCreate = "customer/create";

              let response = await flowApi
                .send(
                  serviceNameCreate,
                  {
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    externalId: user.id,
                  },
                  "POST"
                )
                .catch((error) => error);

              console.log(response);

              if (response.status == "1") {
                customer = await prisma.customer
                  .create({
                    data: {
                      customerId: response.customerId,
                      userId: user.id,
                      status: response.status,
                      wallet: {
                        create: {
                          amount: 0,
                        },
                      },
                    },
                  })
                  .catch((error) => (errorPrisma = error));
              }
            }

            return user;
          });
      }

      if (user)
        return {
          success: true,
          errors: false,
          user: user,
        };
      else {
        return { success: false, errors: JSON.stringify(errors), user: user };
      }
    }
  },
  updateUser: async (parent, args, context) => {
    const errors = {};
    const {
      username,
      firstName,
      lastName,
      birthday,
      gender,
      location,
      language,
      linkProfile,
      tiktok,
      instagram,
      rol,
    } = args.input;

    const data = {
      profile: {
        update: {
          where: {
            userId: args.input.id,
          },
          data: {},
        },
      },
    };

    if (username) {
      data.username = username;

      const users = await prisma.user.findMany({
        where: {
          username: username,
        },
      });

      if (users) {
        errors.username = "Username is already use.";
      }
    }
    if (linkProfile) {
      data.profile.update.data.linkProfile = linkProfile;
    }
    if (firstName) {
      data.firstName = firstName;
      data.updateFirstName = true;
    }
    if (lastName) {
      data.lastName = lastName;
      data.updateLastName = true;
    }
    if (rol) data.rol = rol;

    if (birthday) data.birthday = birthday;
    if (gender) data.gender = gender;

    if (location) data.profile.update.data.location = location;
    if (language) data.profile.update.data.language = language;
    if (tiktok) data.profile.update.data.tiktok = `@${tiktok}`;
    if (instagram) data.profile.update.data.instagram = instagram;

    if (args.input.id && context.authorization && !errors.length) {
      const user = await prisma.user
        .update({
          where: {
            id: args.input.id,
          },
          data: data,
          include: {
            profile: true,
          },
        })
        .catch((error) => {
          console.error(error);
          errors.errorBack = error;
        });

      if (JSON.stringify(errors) !== JSON.stringify({})) {
        console.log(errors);
        return {
          success: false,
          errors: JSON.stringify(errors),
        };
      } else if (user) {
        console.log("USER", user);
        return {
          success: true,
          errors: JSON.stringify(errors),
          user: user,
        };
      }
    }
  },
  deleteUser: async (parent, args, context) => {
    if (context?.authorization) {
      const isDelete = await prisma.user
        .findUnique({
          where: {
            id: args.id,
          },
        })
        .then(async (data) => {
          if (data) {
            await prisma.users.delete({
              where: {
                id: data.id,
              },
            });
            return {
              success: true,
              errors: false,
            };
          } else {
            return {
              success: false,
              errors:
                "No exist user with id provided and authorization token provided",
            };
          }
        });

      return isDelete;
    } else
      return {
        success: false,
        errors: "No Token Authorization",
      };
  },
  userSignIn: async (parent, args, context) => {
    console.log(context);
    if (args.input.userEmail && args.input.password) {
      let where = {};
      let include = { profile: true };

      const schema = Nope.object().shape({
        userEmail: Nope.string().email("isNotEmail"),
      });

      const isNotEmail = schema.validate({
        userEmail: args.input.userEmail,
      });

      if (isNotEmail) where.username = args.input.userEmail;
      else where.email = args.input.userEmail;

      const user = await prisma.user.findUnique({
        where: where,
      });

      if (user) {
        let signIn = await bcrypt.compare(args.input.password, user.password);

        if (signIn) {
          const { userAgent } = context;

          const dataUserAgent = {
            browser: userAgent.browser,
            deviceName: `${userAgent.platform} ${userAgent.os}`,
            source: userAgent.source,
          };

          const session = await prisma.session.create({
            data: { ...dataUserAgent, userId: user.id },
          });

          updateCache(`user-${user.id}-${user.token}`, {
            rol: user.rol,
            token: user.token,
            ...user,
          });

          return {
            success: true,
            errors: false,
            user: user,
            session: session,
          };
        }
      }

      return {
        success: false,
        errors: "Email/usuario y/ó contraseña incorrectos",
        user: false,
      };
    } else
      return {
        success: false,
        errors: "Email/Username or password not provided",
        user: false,
      };
  },
  userLogOut: async (parents, args, context) => {
    return isAuth(
      async (user) => {
        const session = await prisma.sessions
          .findFirst({
            where: {
              deviceName: `${context.userAgent.platform} ${context.userAgent.os}`,
              source: context.userAgent.source,
              userId: user.id,
            },
          })
          .catch((err) => console.err(err));

        if (session) {
          await prisma.session.delete({
            where: {
              id: session.id,
            },
          });
        }

        return {
          success: true,
          errors: false,
        };
      },
      (error) => ({
        errors: JSON.stringify({
          error,
        }),
        success: false,
      }),
      context,
      args.userId
    );
  },
  updateUserContactInfo: async (parents, args, context) => {
    console.log(context.authorization);
    const { userId, email, password } = args.input;
    const errors = {};

    const updateContactInfo = async (user) => {
      let passwordEqual = await bcrypt.compare(
        args.input.password,
        user.password
      );

      if (passwordEqual) {
        if (email === user.email)
          errors.email = "Debes ingresar un correo nuevo.";
        else {
          const existEmail = await isExist("user", "email", email);
          let customer;

          customer = await prisma.customer.findFirst({
            where: {
              userId: userId,
            },
          });

          console.log("CUSTOMER", customer);

          if (!existEmail) {
            if (!customer) {
              let serviceNameCreate = "customer/create";

              try {
                let response = await flowApi
                  .send(
                    serviceNameCreate,
                    {
                      name: `${user.firstName} ${user.lastName}`,
                      email: email,
                      externalId: user.id,
                    },
                    "POST"
                  )
                  .catch((error) => {
                    console.log("ERRORR->", error);
                  });

                if (response.status == "1") {
                  customer = await prisma.customer.create({
                    data: {
                      customerId: response.customerId,
                      userId: user.id,
                      status: response.status,
                      wallet: {
                        create: {
                          amount: 0,
                        },
                      },
                    },
                  });
                }
              } catch (err) {
                errors.email = "Debe ser un correo existente.";
              }
            }

            if (customer) {
              try {
                let serviceEditName = "customer/edit";
                let response = await flowApi.send(
                  serviceEditName,
                  {
                    customerId: customer.customerId,
                    email: email,
                  },
                  "POST"
                );

                console.log(response);

                if (response.status == 1) {
                  const user = await prisma.user
                    .update({
                      where: {
                        id: userId,
                      },
                      data: {
                        email: email,
                      },
                    })
                    .catch((error) => (errors.user = `${error}`));
                  if (user) {
                    console.log("user", user);
                    return {
                      errors: JSON.stringify(errors),
                      success: true,
                      user: user,
                    };
                  }
                }
              } catch (e) {
                errors.email = "Debe ser un correo existente.";
              }
            }

            /*


        
*/
          } else errors.email = "Este correo ya esta siendo utilizado";
        }
      } else errors.password = "The password is wrong";

      console.log(errors);

      return {
        errors: JSON.stringify(errors),
        success: false,
        user: false,
      };
    };

    const response = await isAuth(
      async (user) => {
        return await updateContactInfo(user);
      },
      () => {
        return {
          errors: "not auth",
          success: false,
        };
      },
      context,
      userId
    );

    return response;
  },
  updatePasswordUser: async (parents, args, context) => {
    const errors = {};
    const { oldPassword, newPassword, userId } = args.input;
    const updatePassword = async (user) => {
      let newPasswordEqualOld = await bcrypt.compare(
        newPassword,
        user.password
      );
      let passwordWrong = await bcrypt.compare(oldPassword, user.password);

      console.log(newPasswordEqualOld, passwordWrong);

      if (!newPasswordEqualOld) {
        if (passwordWrong) {
          const bcryptPassword = await encryptPassword(newPassword);

          const user = await prisma.user.update({
            where: {
              id: userId,
            },
            data: {
              password: bcryptPassword,
            },
          });
          if (user)
            return {
              errors: JSON.stringify(errors),
              success: true,
              user: user,
            };
          else
            return {
              errors: JSON.stringify(errors),
              success: false,
              user: user,
            };
        } else errors.oldPassword = "Contraseña incorrecta";
      } else errors.password = "Debes ingresar una contraseña distinta";

      return {
        errors: JSON.stringify(errors),
        success: false,
        user: false,
      };
    };

    const response = await isAuth(
      async (user) => {
        return await updatePassword(user);
      },
      () => {
        return {
          errors: "not auth",
          success: false,
        };
      },
      context,
      userId
    );
    console.log(response);
    return response;
  },
  updateProfile: async (parent, args, context) => {
    const { id, description, frontPage, tiktok, instagram, photo } = args.input;
    const errors = [];

    const response = await isAuth(
      async (user) => {
        const errors = [];
        let newArgs = { ...args.input };

        delete newArgs.id;

        const profile = await prisma.profile
          .update({
            where: {
              userId: id,
            },
            data: { ...newArgs },
            include: {
              users: true,
            },
          })

          .catch((error) => {
            console.error(error);
            errors.push(error);
          });

        const newProfile = { ...profile };

        if (profile.photo) {
          const objectParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: profile.photo,
          };

          const command = new GetObjectCommand(objectParams);

          const url = await getSignedUrl(client, command, { expiresIn: 3600 });

          newProfile.photo = url;
        }

        if (profile.frontPage) {
          const objectParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: profile.frontPage,
          };

          const command = new GetObjectCommand(objectParams);

          const url = await getSignedUrl(client, command, { expiresIn: 3600 });

          newProfile.frontPage = url;
        }

        const newUser = {
          id: id,
          profile: {
            ...newProfile,
          },
        };

        if (profile) {
          return {
            errors: JSON.stringify(errors),
            success: true,
            user: newUser,
          };
        } else {
          return {
            errors: JSON.stringify(errors),
            success: false,
          };
        }
      },
      (error) => errors.push(error),
      context,
      id
    );

    return response;
  },
  blockUser: async (parent, args, context) => {
    const errors = {};
    const blockId = args.input.blockedUserId;
    const response = await isAuth(
      async (user) => {
        const isBlock = await prisma.blocked.findFirst({
          where: {
            userId: user.id,
            blockedBy: blockId,
          },
        });

        if (!isBlock) {
          const blocked = await prisma.blocked
            .create({
              data: {
                userId: blockId,
                blockedBy: user.id,
              },
              include: {
                users: {
                  include: {
                    profile: true,
                  },
                },
              },
            })
            .catch((error) => {
              errors.prisma = error;
            });

          if (JSON.stringify({}) == JSON.stringify(errors)) {
            return {
              success: true,
              errors: false,
              blocked: blocked,
            };
          } else {
            return {
              success: false,
              errors: JSON.stringify(errors),
              blocked: blocked,
            };
          }
        } else {
          errors.isAlreadyBlocked = "The user is already blocked";
          return {
            errors: JSON.stringify(errors),
            success: false,
            blocked: false,
          };
        }
      },
      (error) => {
        return {
          errors: { errorAuth: error },
          success: false,
          blocked: false,
        };
      },
      context,
      args.input.userId
    );
    console.log(response);
    return response;
  },
  deleteBlocked: async (parent, args, context) => {
    const errors = {};
    const blockId = args.input.blockedUserId;
    const response = await isAuth(
      async (user) => {
        console.log(user);
        const isBlock = await prisma.blocked.findFirst({
          where: {
            userId: blockId,
            blockedBy: user.id,
          },
        });

        if (isBlock) {
          const blocked = await prisma.blocked
            .delete({
              where: {
                id: isBlock.id,
              },
            })
            .catch((error) => {
              errors.prisma = error;
            });

          if (JSON.stringify({}) == JSON.stringify(errors)) {
            return {
              success: true,
              errors: false,
              blocked: blocked,
            };
          } else {
            return {
              success: false,
              errors: JSON.stringify(errors),
              blocked: blocked,
            };
          }
        } else {
          errors.isAlreadyBlocked = "The user is not blocked";
          return {
            errors: JSON.stringify(errors),
            success: false,
            blocked: false,
          };
        }
      },
      (error) => {
        console.log("ERROR", error);
        return {
          errors: JSON.stringify({ errorAuth: error }),
          success: false,
          blocked: false,
        };
      },
      context,
      args.input.userId
    );

    console.log(response);
    return response;
  },
  createCustomer: async (parent, args, context) => {
    const response = await isAuth(
      async (user) => {
        let customer = user.customer;
        console.log("CUSTOMER ->", customer);
        if (!customer) {
          let serviceNameCreate = "customer/create";

          let response = await flowApi.send(
            serviceNameCreate,
            {
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              externalId: user.id,
            },
            "POST"
          );

          console.log("customerFLOW", response);

          if (response.status == "1") {
            let errorPrisma;
            customer = await prisma.customer
              .create({
                data: {
                  customerId: response.customerId,
                  userId: user.id,
                  status: response.status,
                },
              })
              .catch((error) => (errorPrisma = error));

            if (errorPrisma)
              return {
                errors: errorPrisma,
                success: false,
              };

            return {
              errors: false,
              user: { ...user, customer: customer },
              success: true,
            };
          }
        }
      },
      (error) => ({ errors: JSON.stringify([errors]) }),
      context,
      args.input.userId,
      {
        customer: true,
      }
    );

    return response;
  },
  updateCustomer: async (parent, args, context) => {
    await prisma.customer
      .update({
        where: {
          userId: args.input.userId,
        },
        data: {
          customerId: args.input.customerId,
        },
      })
      .then((data) => {
        console.log(data);
      });
  },

  deleteCustomer: async (parent, args, context) => {
    await prisma.customer
      .delete({
        where: {
          userId: args.userId,
        },
      })
      .then((data) => {
        console.log(data);
      });
  },
  deleteAccount: async (parent, args, context) => {
    console.log("CONTEXT AUTHORIZATION ->", context.authorization);
    const response = await isAuth(
      async (user) => {
        const username = user.username;
        if (username === user.username) {
          const user = await prisma.user
            .delete({
              where: {
                id: args.input.userId,
              },
            })
            .catch((error) => {
              console.log(error);
            });

          if (user) {
            return {
              success: true,
              errors: false,
            };
          }
        }
      },
      (error) => ({ error: error, success: false }),
      context,
      args.input.userId
    );

    return response;
  },
};
