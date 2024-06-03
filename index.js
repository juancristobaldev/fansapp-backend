const express = require("express"),
  app = express();
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const useragent = require("express-useragent");
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
const { createServer } = require("http");
const flowRoutes = require("./lib/routes/flow");
const { initializeSocketIo, getIo } = require("./lib/socket");

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SECRET_EXPRESS_SESSION,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("trust proxy", true); // Confía en las cabeceras de proxy
app.use(useragent.express());

const httpServer = createServer(app);

initializeSocketIo(httpServer);

const io = getIo();

io.on("connection", (socket) => {
  console.log("connected");

  socket.on("session", (session) => {
    console.log(session);
  });

  socket.on("logOut", async (data) => {
    await prisma.sessions.delete({
      where: {
        userId: data.userId,
        id: parseInt(data.sessionId),
      },
    });

    console.log(data);

    io.emit("logOutSuccess", {
      userId: data.userId,
      sessionId: data.sessionId,
    });
  });
});

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

const upload = multer();

const compressFilesMiddleware = async (req, res, next) => {
  const compressVideo = (file) => {
    try {
      const buffer = file.buffer;

      const command = `${ffmpeg} -i -vf scale=640:480 -c:v libx265 -crf 28 -b:v 1M -c:a aac -b:a 128k -f mp4 pipe:1`;

      const ffmpegProcess = exec(
        command,
        { encoding: "buffer" },
        (error, stdout, stderr) => {
          if (error) {
            console.error("Error al comprimir el video:", stderr);
            reject(error);
            return;
          }

          resolve({
            blob: stdout,
            type: "video",
          });
        }
      );

      ffmpegProcess.stdin(buffer);
      ffmpegProcess.stdin.end();
    } catch (error) {
      console.error("Error al comprimir el video:", error);
      reject(error);
    }
  };

  const compressImage = async (file) => {
    try {
      const buffer = file.buffer;

      const blob = await sharp(buffer)
        .resize() // Ajusta el tamaño de la imagen según sea necesario
        .jpeg({ quality: 50 })
        .toBuffer();

      return {
        blob: blob,
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

    console.log(compressedFiles);

    next();
  } catch (error) {
    res.status(500).send("error al comprimir archivos.");
  }
};

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolvers,
  context: ({ req }) => {
    return {
      userAgent: req.useragent,
      authorization: req.headers.authorization,
      ipAddress: req.ip,
      io: io,
    };
  },
  csrfPrevention: true,
  cache: "bounded",
});

async function startApolloServer() {
  await server.start();
  server.applyMiddleware({ app });
}

app.use("/apiFlow", flowRoutes);

app.post("/delete-files", (req, res) => {
  console.log("delete");
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
  "/compress-files",
  upload.array("files"),
  compressFilesMiddleware,
  async (req, res) => {
    console.log("BODY", req.body);

    const { to, id, user } = req.body;

    const blobs = req.compressedFiles;

    if (blobs.length) {
      let prismaMedias;

      const errors = [];

      console.log("BLOBS", blobs);

      if (!errors.length) {
        res.json({
          success: true,
          blobs: blobs,
          multimedias: prismaMedias,
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

app.get("/", (req, res) => {
  io.emit("path", "/");

  res.send("Node.JS SERVER");
});

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

httpServer.listen(port, () => {
  console.log(`🚀 SOCKET Server running at: ${port}`);
});

module.exports = app;
