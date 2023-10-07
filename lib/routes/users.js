const express = require("express"),
  router = express.Router();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  const users = await prisma.users.findMany();

  res.send(JSON.stringify(users));
});

router.get("/:token", async (req, res) => {
  const token = req.params.token;

  const user = await prisma.users
    .findMany({
      where: {
        token: token,
      },
      include: {
        profile: true,
      },
    })
    .catch((error) => {
      res.send(error);
    });

  if (user[0]) {
    res.send(user);
  } else {
    res.send({ error: true, message: "Not found token" });
  }
});

router.post("/create", async (req, res) => {
  console.log(req.body);

  const data = req.body;

  const token = v4();

  const response = await prisma.users.create({
    data: {
      ...data,
      token: token,
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

router.get("/count-media/:id/:type", async (req, res) => {
  const { id, type } = req.params;
  let response;

  if (type === "all") {
    let types = [
      { type: "images", icon: "faImage" },
      { type: "videos", icon: "faFilm" },
      { type: "audios", icon: "faMicrophone" },
      { type: "files", icon: "faFile" },
    ];

    const images = await prisma.posts.count({
      where: {
        id: parseInt(id),
        type: types[0].type,
      },
    });
    const videos = await prisma.posts.count({
      where: {
        id: parseInt(id),
        type: types[1].type,
      },
    });
    const audios = await prisma.posts.count({
      where: {
        id: parseInt(id),
        type: types[2].type,
      },
    });
    const files = await prisma.posts.count({
      where: {
        id: parseInt(id),
        type: types[3].type,
      },
    });

    types[0].count = images
    types[1].count = videos
    types[2].count = audios
    types[3].count = files

    res.send(types);
  } else {
    response = await prisma.posts.count({
      where: {
        id: parseInt(id),
        type: type,
      },
    });

    res.send(response);
  }
});

module.exports = router;
