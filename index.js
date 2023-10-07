const express = require("express"),
  app = express();

const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const bodyParser = require("body-parser");

require("dotenv").config({ path: "./.env" });

const { PrismaClient } = require("@prisma/client");
const { initPassport } = require("./lib/initPassport");

const userRoutes = require("./lib/routes/users");

const prisma = new PrismaClient();

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SECRET_EXPRESS_SESSION,
  })
);

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

//Routes

app.use("/users", userRoutes);

app.post("/sign-in", async (req, res) => {
  const data = req.body;

  const user = await prisma.users.findUnique({
    where: {
      email: data.email,
    },
  });

  if (user && data.password === user.password) {
    res.send({
      success: true,
      data: user,
    });
  } else {
    res.send({
      success: false,
      error: "Email y/ó contraseña incorrecta",
    });
  }
});

initPassport(app);

app.get("/success", async (req, res) => {
  const user = await req.user;

  if (user) {
    const userQueryParams = new URLSearchParams({ user: JSON.stringify(user) });
    res.redirect(
      `fansapp://localhost:3000/${userQueryParams.toString()}`
    );
  }
});

app.get("/login/federated/google", passport.authenticate("google"));
app.get(
  "/oauth2/redirect/google",
  passport.authenticate("google"),
  (req, res) => {
    res.redirect(`/success`);
  }
);

app.get("/login/federated/facebook", passport.authenticate("facebook"));
app.get(
  "/oauth2/redirect/facebook",
  passport.authenticate("facebook", {
    successRedirect: "/success",
    failureRedirect: "/login",
  })
);

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`🚀 Server running at: ${port}`);
});

module.exports = app;
