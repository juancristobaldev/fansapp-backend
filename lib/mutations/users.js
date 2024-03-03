const Nope = require("nope-validator");
const { PrismaClient } = require("@prisma/client");
const { createUserSchema } = require("../schemas/nope");
const { encryptPassword } = require("../encryptPassword");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const { v4 } = require("uuid");
const isExist = require("../isExist");

// Generar un nuevo token UUID

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
      const { password } = args.input;

      const bcryptPassword = await encryptPassword(password);

      const data = {
        ...args.input,
        password: bcryptPassword,
      };

      const isExistEmail = await isExist("users", "email", args.input.email),
        isExistUser = await isExist("users", "username", args.input.username);

      console.log(isExistEmail, isExistUser);

      if (isExistEmail || isExistUser) {
        errors.isExistEmail = isExistEmail ? true : false;
        errors.isExistUser = isExistUser ? true : false;
      } else {
        user = await prisma.users.create({
          data: {
            token: v4(),
            ...data,
            profile: {
              create: {
                description: "Im a new user in MyFans",
              },
            },
          },
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
    if (context.headers.authorization && args.input.id) {
      const data = { ...args.input };
      delete data.id;

      const user = prisma.users.update({
        where: {
          token: context.headers.authorization,
          id: args.input.id,
        },
        data: data,
      });

      if (user)
        return {
          success: true,
          errors: false,
          user: user,
        };
      else
        return {
          success: false,
          errors: false,
          user: user,
        };
    } else
      return {
        success: false,
        errors: "No Authorization Header // No Id User",
        user: false,
      };
  },
  deleteUser: async (parent, args, context) => {
    if (context.headers.authorization) {
      const isDelete = await prisma.users
        .findUnique({
          where: {
            token: context.headers.authorization,
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
    console.log(args.input);
    if (args.input.userEmail && args.input.password) {
      let where = {};

      const schema = Nope.object().shape({
        userEmail: Nope.string().email("isNotEmail"),
      });

      const isNotEmail = schema.validate({
        userEmail: args.input.userEmail,
      });

      if (isNotEmail) where.username = args.input.userEmail;
      else where.email = args.input.userEmail;

      const user = await prisma.users.findUnique({
        where: where,
      });

      if (user) {
        let signIn = await bcrypt.compare(args.input.password, user.password);

        if (signIn)
          return {
            success: true,
            errors: false,
            user: user,
          };
        else {
          return {
            success: false,
            errors: "Email/usuario y/ó contraseña incorrectos",
            user: false,
          };
        }
      } else {
        return {
          success: false,
          errors: "Email/usuario y/ó contraseña incorrectos",
          user: false,
        };
      }
    } else
      return {
        success: false,
        errors: "Email/Username or password not provided",
        user: false,
      };
  },
  userSignInRRSS: async (parent, args, context) => {},
};
