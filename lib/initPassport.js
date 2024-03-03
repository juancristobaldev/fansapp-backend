const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const session = require("express-session");
const passport = require("passport");
const { google } = require("googleapis");

require("dotenv").config({ path: "./.env" });

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook");

const { encryptPassword } = require("./encryptPassword");
const { getDataPeopleApi } = require("./getDataPeopleApi");

const initPassport = (app) => {
  app.use(
    session({
      resave: false,
      saveUninitialized: true,
      secret: process.env.SECRET_EXPRESS_SESSION,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://google.com",
        scope: [
          "profile",
          "https://www.googleapis.com/auth/userinfo.profile",
          "email",
        ],
      },
      async (accessToken, refreshToken, profile, cb) => {
        const response = await prisma.users.findMany({
          where: {
            token: profile.id,
          },
        });

        let result;

        if (!response.length) {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
          );

          let variables = {
            token: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
          };

          const { birthday, gender } = await getDataPeopleApi(
            accessToken,
            oauth2Client
          );

          const { hashedPassword, salt } = await encryptPassword(
            profile.id
          ).catch((error) => {
            console.error("Error al encriptar la contraseña:", error);
          });

          variables = {
            ...variables,
            birthday: birthday ? birthday : null,
            gender: gender ? gender : null,
            password: hashedPassword,
            salt,
          };

          const profilePhoto = profile.photos[0].value;

          if (profilePhoto) {
            variables = {
              ...variables,
              profile: {
                create: {
                  photo: profilePhoto,
                },
              },
            };
          }

          const user = await prisma.users
            .create({
              data: {
                ...variables,
              },
            })
            .catch((error) => {
              cb(error, null);
            });

          result = {
            accessToken,
            user,
          };
        } else {
          result = response;
        }

        return cb(null, result);
      }
    )
  );

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env["FACEBOOK_CLIENT_ID"],
        clientSecret: process.env["FACEBOOK_SECRET_CLIENT"],
        callbackURL: "http://localhost:3000/oauth2/redirect/facebook",
        state: true,
        profileFields: [
          "id",
          "displayName",
          "name",
          "email",
          "gender",
          "birthday",
          "photos",
        ],
      },
      async (accessToken, refreshToken, profile, cb) => {
        const json = profile._json;

        const response = await prisma.users.findMany({
          where: {
            token: json.id,
          },
        });

        let result;

        if (!response.length) {
          const getRandomNumber = () => {
            const numero1 = Math.floor(Math.random() * 10); // Número aleatorio entre 0 y 9
            const numero2 = Math.floor(Math.random() * 10);
            const numero3 = Math.floor(Math.random() * 10);
            const numero4 = Math.floor(Math.random() * 10);

            const numerosAleatorios = `${numero1}${numero2}${numero3}${numero4}`;
            return numerosAleatorios;
          };

          const getRandomEmail = (profile) => {
            const random = getRandomNumber();

            const email = `${profile.name.givenName.toLowerCase()}${profile.name.familyName.toLowerCase()}${random}@fromfacebook.com`;

            return email;
          };

          const findEmail = async (callback) => {
            const email = getRandomEmail(profile);

            const user = await prisma.users.findUnique({
              where: {
                email: email,
              },
            });

            if (user) {
              callback();
            } else {
              return email;
            }
          };

          const email = await findEmail(findEmail);

          const { hashedPassword, salt } = await encryptPassword(
            profile.id
          ).catch((error) => {
            console.error("Error al encriptar la contraseña:", error);
          });

          let variables = {
            token: json.id,
            name: profile.displayName,
            email: email,
            password: hashedPassword,
            salt: salt,
          };

          let profileData = {
            photo: json.picture.data.url,
            description:
              "Add a new description to your profile and surprise your followers...",
          };

          user = await prisma.users.create({
            data: {
              ...variables,
              profile: {
                create: {
                  ...profileData,
                },
              },
            },
          });

          result = {
            accessToken,
            user,
          };
        } else {
          result = response;
        }

        return cb(null, result);
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user from the sessions
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
};

module.exports = { initPassport };
