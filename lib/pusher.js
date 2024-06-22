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
module.exports = async (userId, notification, object, type) => {
  const notifications = await prisma.notifications.findFirst({
    where: {
      id: userId,
    },
  });
  if (notifications[type]) {
    pusher
      .trigger(`notifications`, `${userId}`, {
        message: notification,
        data: { ...object, type },
      })
      .catch((error) => {
        console.log(error);
      });
  }
};
