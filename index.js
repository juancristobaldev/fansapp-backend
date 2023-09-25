const express = require("express"),
  app = express();

require("dotenv").config({ path: "./.env" });


const cors = require("cors");

const session = require("express-session");

const passport = require("passport");

const bodyParser = require("body-parser");

require("dotenv").config({ path: "./.env" });

const { PrismaClient } = require("@prisma/client");
const { initPassport } = require("./lib/initPassport");

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

app.get("/users", async (req, res) => {
  const users = await prisma.users.findMany();

  res.send(JSON.stringify(users));
});

app.post("/create-user", async (req, res) => {
  console.log(req.body);

  const data = req.body;

  const response = await prisma.users.create({
    data: {
      ...data,
    },
  });

  if (response) {
    res.send({
      success: true,
      data: response,
    });
  } else {
    res.send({
      success: false,
      data: response,
    });
  }
});

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

app.get("/login/facebook", passport.authenticate("facebook"));

app.get(
  "/oauth2/redirect/facebook",
  passport.authenticate("facebook", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/");
  }
);


const port = process.env.PORT;

app.get("/", (req, res) => {
  res.send("Hello word");
});

app.listen(port, () => {
  console.log(`🚀 Server running at: ${port}`);
});

module.exports = app
