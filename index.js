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
const {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { file } = require("googleapis/build/src/apis/file");
const { v4 } = require("uuid");
const { initS3Client } = require("./lib/aws3Functions");

const client = initS3Client();

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
const upload = multer();

const compressFilesMiddleware = async (req, res, next) => {
  const compressVideo = (file) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(file);
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
            console.log("video comprimido:", stdout);
            resolve({
              blob: stdout,
              type: file.mimetype,
              name: file.originalname,
            });
          }
        );

        ffmpegProcess.stdin(buffer);
        ffmpegProcess.stdin.end();
      } catch (error) {
        console.error("Error al comprimir el video:", error);
        reject(error);
      }
    });
  };

  const compressImage = async (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        const buffer = file.buffer;
        console.log(file);
        const blob = await sharp(buffer)
          .resize() // Ajusta el tamaño de la imagen según sea necesario
          .jpeg({ quality: 50 })
          .toBuffer();

        const blur = await sharp(buffer)
          .resize()
          .jpeg({ quality: 50 })
          .blur(50)
          .toBuffer();

        resolve({
          blob: blob,
          type: file.mimetype,
          blur: blur,
          name: file.originalname,
        });
      } catch (error) {
        console.error("Error al comprimir la imagen:", error);
        reject(error);
      }
    });
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

    console.log("COMPRESSED FILES ->", compressedFiles);
    req.compressedFiles = compressedFiles;

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
  "/upload-files",
  upload.array("files"),
  compressFilesMiddleware,
  async (req, res) => {
    const { to, id, userId } = req.body;
    const blobs = req.compressedFiles;

    const uploadFileToSw3 = async (uploadParams) => {
      try {
        const data = await client.send(new PutObjectCommand(uploadParams));
        console.log("Archivo subido a S3:", data);
        return data;
      } catch (error) {
        console.log("ERROR:", error);
        reject(error);
      }
    };

    let pathsSw3 = [];

    for (const buffer of blobs) {
      try {
        const key = `${v4() + buffer.name}`;
        const uploadParams = {
          Key: key,
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: buffer.blob, // Ruta local del archivo a subir
          ContentType: buffer.type, // Por ejemplo, "video/mp4"
        };

        const blurParams = {
          Key: `blur-${key}`,
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: buffer.blur, // Ruta local del archivo a subir
          ContentType: buffer.type, // Por ejemplo, "video/mp4"
        };

        const data = await uploadFileToSw3(uploadParams);
        const blur = await uploadFileToSw3(blurParams);

        let newPathsSw3 = {};

        if (data[`$metadata`].httpStatusCode == 200) {
          newPathsSw3 = {
            ...newPathsSw3,
            key,
            type: buffer.type.includes("image") ? "image" : "video",
          };
        }

        if (blur[`$metadata`].httpStatusCode == 200) {
          newPathsSw3 = {
            ...newPathsSw3,
            blur: `blur-${key}`,
          };
        }
        console.log("newPathsSw3 -> ", newPathsSw3);
        pathsSw3.push(newPathsSw3);
      } catch (error) {
        console.error("Error al subir un archivo a S3:", error);
      }
    }

    if (pathsSw3.length) {
      if (to === "multimedia") {
        const multimediasID = [];

        for (const pathSw3 of pathsSw3) {
          try {
            console.log(userId);

            multimedia = await prisma.multimedia.create({
              data: {
                source: pathSw3.key,
                type: pathSw3.type,
                usersId: parseInt(userId),
                blur: pathSw3.blur ? pathSw3.blur : null,
              },
            });

            console.log("multimedia creado:", multimedia);

            if (multimedia) multimediasID.push(multimedia.id);
          } catch (error) {
            console.log(error);
          }
        }

        if (multimediasID.length) {
          pathsSw3 = multimediasID;
        }
      }

      res.send({
        sw3Items: pathsSw3,
        success: true,
      });
    } else {
      res.send({
        sw3Items: [],
        success: false,
      });
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
