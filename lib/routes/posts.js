const express = require("express"),
  router = express.Router();

const { PrismaClient } = require("@prisma/client");
const getDatetime = require("../getDate");

const prisma = new PrismaClient();

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  const posts = await prisma.posts.findMany({
    where: {
      usersId: parseInt(userId),
    },
  });

  res.send(JSON.stringify(posts));
});

router.post("/create", async (req, res) => {
  const { location, multimedia, description, onlySuscriptors, user } =
    req.body.json;

  let data = {
    location: location ? JSON.stringify(location) : null,
    multimedia: multimedia ? JSON.stringify(multimedia) : null,
    description,
    onlySuscriptors,
  };

  const dateTime = getDatetime();

  const result = await prisma.posts.create({
    data: {
      ...data,
      users: {
        connect: {
          id: user.profile.userId,
        },
      },
    },
  });

  console.log(result);
});

router.post("delete-all", async (req, res) => {
  const response = await prisma.posts.findMany();
  res.send(response);
});

module.exports = router;
