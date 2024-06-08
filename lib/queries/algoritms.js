const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = {
  getMyHub: async (parent, args, context) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7); // Establecer el inicio de la semana hace 7 días

    const posts = await prisma.posts.findMany({
      take: 4,
      skip: 0,
      where: {
        createdAt: {
          gte: startOfWeek.toISOString(), // Convertir a formato ISO 8601,
          lte: today.toISOString(),
        },
        privacity: {
          equals: "public",
        },
        multimedia: {
          some: {}, // Verificar si existe al menos un elemento en multimedia
        },
      },
      select: {
        id: true,
        multimedia: true,
        createdAt: true,
        users: {
          select: {
            username: true,
          },
        },
        likes: {
          select: {
            id: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
        bookmarkers: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log(posts);

    let relevatedPosts = posts.map((post) => {
      const interactions = post.likes.length + post.comments.length;
      const interactionsWeight = 0.6;
      const freshWeight = 0.3;

      const now = new Date();
      const timeAgo = now.getTime() - new Date(post.createdAt).getTime();
      const hoursAgo = timeAgo / (1000 * 3600); // Convertir a horas

      let relevant = interactions * interactionsWeight;
      relevant += (1 / hoursAgo) * freshWeight;

      const newPost = {
        relevant,
        ...post,
      };

      console.log(newPost);

      return newPost;
    });

    const sortedPosts = relevatedPosts
      .sort((a, b) => b.relevant - a.relevant)
      .map((item) => {
        delete item.relevant;
        return item;
      });

    return sortedPosts;
  },
  getPopularsCreators: async (parent, args, context) => {
    // Obtener la fecha de inicio de la semana actual
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Ajuste al primer día de la semana

    // Hacer una consulta para obtener los creadores y sus últimos 10 posts de esta semana
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profile: {
              select: {
                photo: true,
                frontPage: true,
              },
            },
            posts: {
              take: 10,
              orderBy: {
                createdAt: "desc",
              },
              where: {
                createdAt: {
                  gte: startOfWeek.toISOString(),
                  lte: today.toISOString(),
                },
              },
              select: {
                id: true,
                likes: {
                  select: {
                    id: true,
                  },
                },
                comments: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        suscriptors: {
          select: {
            id: true,
          },
        },
        saveds: {
          select: {
            id: true,
          },
        },
      },
    });

    // Calcular la relevancia de cada creador
    const calculatedRelevantCreator = creators.map((creator) => {
      const postRelevance = creator.user.posts.reduce(
        (total, post) => total + post.likes.length + post.comments.length,
        0
      );
      const subscribersCount = creator.suscriptors.length;
      const savedsCount = creator.saveds.length;
      creator.relevance =
        postRelevance + subscribersCount * 2 + savedsCount * 1.5;

      return creator;
    });

    // Ordenar los creadores en función de su relevancia y devolver solo el perfil
    console.log(calculatedRelevantCreator);
    // Devolver la lista de los creadores más relevantes
    return creators;
  },
  getNewsCreators: async (parent, args, context) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7); // Establecer el inicio de la semana hace 7 días

    const creators = await prisma.creator.findMany({
      take: 4,
      skip: 0,
      select: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                id: true,
                frontPage: true,
                photo: true,
              },
            },
          },
        },
      },
      where: {
        status: {
          equals: "approbed",
        },
        approbedDate: {
          gte: startOfWeek.toISOString(), // Convertir a formato ISO 8601,
          lte: today.toISOString(),
        },
      },
    });

    const profilesCreator = creators.map((creator) => {
      const profile = {
        ...creator.user.profile,
        users: {
          ...creator.user,
        },
      };

      return profile;
    });

    console.log(profilesCreator);

    return profilesCreator;
  },
};
