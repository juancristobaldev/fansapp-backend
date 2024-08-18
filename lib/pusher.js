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

module.exports = {
  emitNotifications: async (
    userId,
    contentNotification,
    object,
    type,
    idUser
  ) => {
    const notifications = await prisma.privacityNotification.findFirst({
      where: {
        id: userId,
      },
    });

    console.log(notifications);
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

      let notification;
      try {
        notification = await prisma.notification.create({
          data: {
            usersId: idUser,
            content: `${contentNotification}`,

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

        console.log(notification);
      } catch (error) {
        console.log(error);
      }

      console.log("NOTIFICAITON ->", notification);

      pusher
        .trigger(`notifications`, `${userId}`, notification)
        .then((data) => {
          console.log(data);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  },
  sendMessage: (transmitterId, receiverId, conversationId, message) => {
    //t=${transmitterId}&${receiverId ? `t=${receiverId}` : `c=${conversationId}`}

    pusher
      .trigger(`messages`, `update-chat`, {
        message: message,
        members: receiverId,
        chat: conversationId,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.log(error);
      });
  },
};
