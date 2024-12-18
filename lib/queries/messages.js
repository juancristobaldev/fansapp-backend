const isAuth = require("../isAuth");
const { getUrlMultimedia } = require("../aws3Functions");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;

module.exports = {
  getConversations: async (parent, args, context) => {
    const { transmitterId, username, typeMessages, typeChat } = args.input;

    console.log(args.input);
    return isAuth(
      async (user) => {
        let chats;
        let seen = [];
        let notseen;

        if (typeMessages === "seen") {
          seen.push({
            conversation: {
              NOT: {
                messages: {
                  some: {
                    AND: [
                      {
                        seen: false,
                      },
                      {
                        transmitterId: {
                          not: transmitterId,
                        },
                      },
                    ],
                  },
                },
              },
            },
          });
        } else if (typeMessages === "not-seen") {
          notseen = {
            messages: {
              some: {
                transmitterId: {
                  not: transmitterId,
                },
                seen: false,
              },
            },
          };
        }

        const membersConversations = await prisma.membersConversation.findMany({
          where: {
            AND: [
              {
                usersId: args.input.transmitterId,
                rol: "admin",
              },
              {
                conversation: {
                  members: {
                    some: {
                      user: {
                        username: {
                          mode: "insensitive",
                          contains: username,
                        },
                      },
                    },
                  },
                  ...notseen,
                },
              },
              ...seen,
            ],
          },
          include: {
            conversation: {
              include: {
                messages: {
                  // Incluir los mensajes de la conversación
                  orderBy: {
                    createdAt: "desc", // Ordenar por fecha de creación descendente (el más nuevo primero)
                  },
                  select: {
                    id: true,
                    content: true,
                    transmitterId: true,
                    seen: true,
                    createdAt: true,
                  },
                  take: 1, // Tomar solo el primer mensaje (el más nuevo)
                },
                members: {
                  where: {
                    usersId: {
                      not: transmitterId,
                    },
                  },
                  select: {
                    joinAt: true,
                    usersId: true,
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        username: true,
                        profile: {
                          select: {
                            photo: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const newChats = [];

        if (membersConversations.length) {
          for (let memberConversation of membersConversations) {
            let chat = memberConversation.conversation;

            console.log(chat);
            try {
              chat.title = `${chat.members[0].user.firstName} ${chat.members[0].user.lastName}`;
              chat.subtitle = `${chat.members[0].user.username}`;
              if (chat.members[0].user.profile.photo)
                chat.photo = await getUrlMultimedia(
                  process.env.AWS_BUCKET_NAME,
                  chat.members[0].user.profile.photo
                );

              delete chat.members[0].user;
              newChats.push(chat);
            } catch (err) {
              console.log(error);
            }
          }
        }

        return newChats;
      },
      (error) => {
        console.log(error);
        return null;
      },
      context,
      transmitterId
    );
  },
  getConversation: async (parent, args, context) => {
    if (
      !args.input.transmitterId ||
      !context.authorization ||
      (!args.input.receiverId && !args.input.conversationId)
    )
      return null;

    return isAuth(
      async (user) => {
        try {
          let chat;

          if (args.input.receiverId) {
            const conversation = await prisma.membersConversation.findFirst({
              where: {
                AND: [
                  {
                    usersId: args.input.transmitterId,
                    rol: "admin",
                  },
                  {
                    conversation: {
                      members: {
                        some: {
                          usersId: args.input.receiverId,
                          rol: "admin",
                        },
                      },
                    },
                  },
                ],
              },
              include: {
                conversation: {
                  include: {
                    messages: {
                      orderBy: {
                        createdAt: "asc",
                      },
                      include: {
                        multimedia: true,
                      },
                    },
                  },
                },
              },
            });

            if (conversation) {
              chat = { ...conversation.conversation };

              const messageNotSeen = await prisma.message.count({
                where: {
                  conversationId: chat.id,
                  seen: false,
                  transmitterId: {
                    not: args.input.transmitterId,
                  },
                },
              });
              console.log("messageNotSeen", messageNotSeen);

              if (messageNotSeen > 0) {
                chat.notseen = messageNotSeen;
              }

              newMessages = [];

              for (let message of chat.messages) {
                let newMessage = {
                  ...message,
                };
                if (message.multimedia.length) {
                  let multimedias = [];
                  for (let multimedia of message.multimedia) {
                    try {
                      multimedia.source = await getUrlMultimedia(
                        process.env.AWS_BUCKET_NAME,
                        multimedia.source
                      );

                      multimedias.push(multimedia);
                    } catch (err) {
                      console.log(err);
                    }
                  }

                  newMessage = {
                    ...message,
                    multimedia: multimedias,
                  };
                }

                newMessages.push(newMessage);
              }
            }

            const receiver = await prisma.users.findUnique({
              where: {
                id: args.input.receiverId,
              },
              select: {
                firstName: true,
                lastName: true,
                username: true,
                profile: {
                  select: {
                    photo: true,
                  },
                },
              },
            });

            let photo;
            if (receiver.profile.photo) {
              photo = await getUrlMultimedia(
                process.env.AWS_BUCKET_NAME,
                receiver.profile.photo
              );
            }

            chat = {
              photo,
              title: `${receiver.firstName} ${receiver.lastName}`,
              subtitle: `${receiver.username}`,
              ...chat,
              messages: newMessages,
            };
          }

          return chat;
          /*
        
        chat = await prisma.conversation.findFirst({
          where: {
            AND: [
              {
                type: 'list',
              },
              {
                AND: {
                  members: {
                    some: {},
                  },
                },
              },
            ],
          },
        });
        */
        } catch (error) {
          console.log(error);
        }
      },
      (error) => {
        console.log(error);
        return null;
      },
      context,
      args.input.transmitterId
    );
  },
  getListUsers: async (parent, args, context) => {},
  haveNotSeenConversations: async (parent, args, context) => {
    const { transmitterId } = args;
    console.log(args);
    if (!transmitterId && !context.authorization) return [];

    return await isAuth(
      async () => {
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

        console.log(conversationsNotSeen);

        return {
          id: transmitterId,
          count: conversationsNotSeen,
        };
      },
      (error) => {
        console.log("ERROR", error);
        return null;
      },
      context,
      transmitterId
    );
  },
};
