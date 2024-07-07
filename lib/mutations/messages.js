const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();
const FlowApi = require("flowcl-node-api-client");
const { chat } = require("googleapis/build/src/apis/chat");
const { sendMessage } = require("../pusher");

module.exports = {
  sendMessage: async (parent, args, context) => {
    if (!args.input.transmitterId || !args.input.content.length) return null;

    return await isAuth(
      async (user) => {
        let chat, message, multimedia;

        if (args.input.multimedia && args.input.multimedia?.length) {
          multimedia = {
            connect: [...args.input.multimedia],
          };
        }

        if (args.input.receiverId) {
          const conversation = await prisma.membersConversation.findFirst({
            where: {
              usersId: args.input.transmitterId,
              rol: "admin",
              conversation: {
                members: {
                  some: {
                    usersId: args.input.receiverId,
                    rol: "admin",
                  },
                },
              },
            },
            select: {
              conversation: {
                include: {
                  members: true,
                },
              },
            },
          });

          if (conversation) {
            chat = conversation.conversation;
          }

          if (chat) {
            message = await prisma.message.create({
              data: {
                content: args.input.content,
                transmitterId: args.input.transmitterId,
                conversationId: chat.id,
                multimedia: multimedia,
              },
              include: {
                multimedia: true,
              },
            });

            chat.messages = [message];
          }

          if (!chat) {
            chat = await prisma.conversation.create({
              data: {
                messages: {
                  create: {
                    transmitterId: args.input.transmitterId,
                    content: args.input.content,
                    multimedia: multimedia,
                  },
                },
                members: {
                  createMany: {
                    data: [
                      {
                        usersId: args.input.transmitterId,
                        rol: "admin",
                      },
                      {
                        usersId: args.input.receiverId,
                        rol: "admin",
                      },
                    ],
                  },
                },
              },
              include: {
                messages: {
                  include: {
                    multimedia: true,
                  },
                },
                members: {
                  select: {
                    usersId: true,
                  },
                },
              },
            });
          }

          message = chat.messages[0];
        }

        const membersWithOutMe = chat.members.map((member) => member.usersId);

        sendMessage(
          args.input.transmitterId,
          membersWithOutMe,
          chat.id,
          message
        );

        return {
          ...chat,
        };
      },
      (error) => console.log(error),
      context,
      args.input.transmitterId
    );
  },
  seenMessage: async (parent, args, context) => {
    const { id, transmitterId } = args.input;

    if (!id || !transmitterId) return null;

    return await isAuth(
      async (user) => {
        try {
          let conversation = await prisma.conversation.findFirst({
            where: {
              id: id,
            },
            select: {
              id: true,
              messages: {
                select: {
                  id: true,
                },
                where: {
                  seen: false,
                  transmitterId: {
                    not: {
                      equals: transmitterId,
                    },
                  },
                },
              },
            },
          });

          if (conversation.messages.length) {
            const ids = conversation.messages.map((message) => message.id);

            let newMessages = [...conversation.messages];

            await prisma.message.updateMany({
              where: {
                id: {
                  in: ids, // Filtras por los IDs de los mensajes obtenidos anteriormente
                },
              },
              data: {
                seen: true, // Estableces seen a true para todos los mensajes seleccionados
              },
            });

            newMessages.forEach((message) => {
              message.seen = true;
            });

            conversation.messages = newMessages;

            const conversationsNotSeen = await prisma.conversation.count({
              where: {
                AND: [
                  {
                    messages: {
                      some: {
                        seen: false,
                        transmitterId: {
                          not: transmitterId,
                        },
                      },
                    },
                  },
                  {
                    members: {
                      some: {
                        usersId: transmitterId,
                      },
                    },
                  },
                ],
              },
            });

            return {
              id: transmitterId,
              count: conversationsNotSeen,
            };
          }
        } catch (error) {
          console.log(error);
          return null;
        }
      },
      (error) => {
        console.log(error);
        return null;
      },
      context,
      transmitterId
    );

    /*
    input UpdateConversationInput {
    id: Int!
    seen: Boolean
    transmitterId: Int
  }
    */
  },
};
