const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getUrlMultimedia } = require("../aws3Functions");
const client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_PUBLIC_KEY,
    secretAccessKey: process.env.AWSSECRET_KEY,
  },
});

module.exports = {
  getMyHub: async (parent, args, context) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7); // Establecer el inicio de la semana hace 7 días
    console.log(args.input);
    const posts = await prisma.posts.findMany({
      take: args.input.take || 4,
      skip: !args.input.skip ? 0 : args.input.skip,
      orderBy: {
        createdAt: "desc",
      },
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
    let updatedUrlMultimediaPosts = [];

    for (const post of posts) {
      try {
        let newPost = {
            ...post,
          },
          newMultimedia = [post.multimedia[0]];

        newMultimedia[0].source = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          newMultimedia[0].source
        );

        newPost.multimedia = newMultimedia;

        updatedUrlMultimediaPosts.push(newPost);
      } catch (error) {
        console.log(error);
      }
    }

    let relevatedPosts = updatedUrlMultimediaPosts.map((post) => {
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

    console.log(sortedPosts);

    return sortedPosts;
  },
  getPopularsCreators: async (parent, args, context) => {
    if (args.input.get != null && args.input.get === false) return [];

    // Obtener la fecha de inicio de la semana actual
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Ajuste al primer día de la semana

    // Hacer una consulta para obtener los creadores y sus últimos 10 posts de esta semana
    const creators = await prisma.creator.findMany({
      take: 3,
      skip: args.input.skip ? args.input.skip : 0,
      orderBy: {
        approbedDate: "desc",
      },
      where: {
        status: {
          equals: "creator",
        },
      },
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
    const calculatedRelevantCreator = creators
      .map((creator) => {
        const postRelevance = creator.user.posts.reduce(
          (total, post) => total + post.likes.length + post.comments.length,
          0
        );
        const subscribersCount = creator.suscriptors.length;
        const savedsCount = creator.saveds.length;
        creator.relevance =
          postRelevance + subscribersCount * 2 + savedsCount * 1.5;

        return creator;
      })
      .sort((a, b) => b.relevance - a.relevance)
      .map((item) => {
        delete item.relevance;
        return item;
      });

    const profilesCreator = [];

    for (const relevantCreator of calculatedRelevantCreator) {
      try {
        let newProfile = {
          ...relevantCreator.user.profile,
          user: {
            ...relevantCreator.user,
          },
        };

        newProfile.photo = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          newProfile.photo
        );

        newProfile.frontPage = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          newProfile.frontPage
        );

        profilesCreator.push(newProfile);
      } catch (error) {
        console.log(error);
      }
    }

    return profilesCreator;

    // Ordenar los creadores en función de su relevancia y devolver solo el perfil
  },
  getNewsCreators: async (parent, args, context) => {
    if (args.input.get != null && args.input.get === false) return [];

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7); // Establecer el inicio de la semana hace 7 días

    console.log(args.input);

    const creators = await prisma.creator.findMany({
      take: 3,
      orderBy: {
        approbedDate: "desc",
      },
      skip: args.input.skip ? args.input.skip : 0,
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
          equals: "creator",
        },
        approbedDate: {
          gte: startOfWeek.toISOString(), // Convertir a formato ISO 8601,
          lte: today.toISOString(),
        },
      },
    });

    console.log("creators -> ", creators);

    const profilesCreators = [];

    for (const creator of creators) {
      try {
        let newProfileCreator = {
          ...creator.user.profile,
          user: {
            ...creator.user,
          },
        };

        newProfileCreator.frontPage = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          creator.user.profile.frontPage
        );

        console.log("frontpage->", newProfileCreator.frontPage);

        newProfileCreator.photo = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          creator.user.profile.photo
        );

        profilesCreators.push(newProfileCreator);
      } catch (error) {
        console.log(error);
      }
    }

    console.log(profilesCreators);

    return profilesCreators;
  },
};
