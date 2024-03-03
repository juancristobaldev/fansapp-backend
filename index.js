const express = require("express"),
  app = express();

const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");

const typeDefs = require("./lib/gql/defs");

require("dotenv").config({ path: "./.env" });

const { PrismaClient } = require("@prisma/client");
const { initPassport } = require("./lib/initPassport");

const resolvers = require("./lib/resolvers");
const { ApolloServer } = require("apollo-server-express");
const sharp = require("sharp");
const { exec } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const fs = require("fs");

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

const compressFilesMiddleware = async (req, res, next) => {
  const compressVideo = (file) => {
    try {
      const inputFilePath = file.path;
      const outputFilePath = `${file.destination}compressed-${file.filename}`;

      const command = `${ffmpeg} -i ${inputFilePath} -vf scale=640:480 -c:v libx265 -crf 28 -b:v 1M -c:a aac -b:a 128k ${outputFilePath}`;
      exec(command, (error) => {
        if (error) console.error(error);
      });

      return {
        deleteFilePath: path.join("uploads", file.filename),
        outputFilePath,
        type: "video",
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const compressImage = (file) => {
    try {
      const inputFilePath = file.path;
      const outputFilePath = `${file.destination}compressed-${file.filename}`;

      sharp(inputFilePath)
        .resize() // Ajusta el tamaño de la imagen según sea necesario
        .toFile(outputFilePath, (error) => {
          if (error) console.error("error", error);
        });

      return {
        deleteFilePath: path.join("uploads", file.filename),
        outputFilePath,
        type: "image",
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const compressPromises = req.files.map(async (file) => {
      if (file.mimetype.startsWith("image")) {
        return await compressImage(file);
      } else {
        return await compressVideo(file);
      }
    });

    const compressedFiles = await Promise.all(compressPromises);
    req.compressedFiles = compressedFiles;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("error al comprimir archivos.");
  }
};

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

//Routes
/*

app.use("/users", userRoutes);
app.use("/posts", postRoutes);
 */

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolvers,
  context: ({ req }) => {
    return {
      authorization: req.headers.authorization,
    };
  },
  csrfPrevention: true,
  cache: "bounded",
});

async function startApolloServer() {
  await server.start();
  server.applyMiddleware({ app });
}

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

app.post("/delete-files", (req, res) => {
  req.body.forEach((paths) => {
    if (fs.existsSync(paths.deleteFilePath)) {
      fs.unlinkSync(paths.deleteFilePath);
      res.json({
        success: true,
      });
    } else {
      res.json({
        success: false,
        error: `El archivo '${paths.deleteFilePath}' no existe.`,
      });
    }
  });
});

app.post(
  "/upload-files",
  upload.array("files"),
  compressFilesMiddleware,
  async (req, res) => {
    console.log("BODY", req.body);

    const { to, id, user } = req.body;

    const paths = req.compressedFiles;

    if (paths.length) {
      if (to === "post") {
        const multimedias = paths.map((multimedia) => ({
          type: multimedia.type,
          source: multimedia.outputFilePath,
          postsId: parseInt(id),
          usersId: parseInt(user),
        }));

        await prisma.multimedia.createMany({
          data: multimedias,
        });
      } else if (to === "frontPage" || to === "photo") {
        let data = {};

        if (to === "frontPage") data.frontPage = paths[0].outputFilePath;
        else {
          data.photo = paths[0].outputFilePath;
        }

        await prisma.profile.update({
          where: {
            userId: parseInt(user),
          },
          data: data,
        });
      }

      const response = await fetch("http://localhost:3001/delete-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paths),
      });

      if (response.status === 200) {
        res.json({
          success: true,
        });
      } else {
        res.json({
          success: false,
        });
      }
    }
  }
);

initPassport(app);

app.get("/success", async (req, res) => {
  const user = await req.user;
  auth;
  if (user) {
    const userQueryParams = new URLSearchParams({ user: JSON.stringify(user) });
    res.redirect(`fansapp://localhost:3000/${userQueryParams.toString()}`);
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

startApolloServer();

app.listen(port, () => {
  console.log(`🚀 Server running at: ${port}`);
});

module.exports = app;
