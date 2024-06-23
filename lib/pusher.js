const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET_KEY,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});
module.exports = async (userId, contentNotification, object, type, idUser) => {
  const notifications = await prisma.notifications.findFirst({
    where: {
      id: userId,
    },
  });
  if (notifications[type]) {
    let connect = {
      likesId: null,
      commentsId: null,
    };

    console.log(object);

    if (type === "likes") {
      connect.likesId = object.id;
    }

    if (type === "comments") {
      connect.commentsId = object.id;
    }

    let fechaHoraChile = new Date().toLocaleString("en-US", {
      timeZone: "America/Santiago",
    });

    // Convertir la fecha y hora a formato ISO-8601
    let isoFechaHoraChile = new Date(fechaHoraChile).toISOString();
    let notification;
    try {
      notification = await prisma.notification.create({
        data: {
          usersId: idUser,
          content: `${contentNotification}`,
          createdAt: isoFechaHoraChile,
          ...connect,
          receiverId: userId,
        },
        include: {
          comments: true,
          likes: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      });
    } catch (error) {
      console.log(error);
    }

    pusher
      .trigger(`notifications`, `${userId}`, notification)
      .catch((error) => {
        console.log(error);
      });
  }
};
