const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const session = require("express-session");

const passport = require("passport");

const initPassport = (app) => {
  require("dotenv").config({ path: "./.env" });

  app.use(
    session({
      resave: false,
      saveUninitialized: true,
      secret: process.env.SECRET_EXPRESS_SESSION,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const FacebookStrategy = require("passport-facebook");

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_SECRET_CLIENT,
        callbackUrl: process.env.FACEBOOK_REDIRECT_URL,
      },
      async function (accessToken, refreshToken, profile, cb) {
        console.log(accessToken);
      }
    )
  );
};

module.exports = { initPassport };
