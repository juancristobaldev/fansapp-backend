const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

module.exports = {
  addHashTag: async (parent, args, context) => {
    const { hashtag, userId } = args.input;
    let defaultError = {
      errors: "not authorized",
      success: false,
    };

    if (!hashtag || !userId) return defaultError;

    console.log;

    return await isAuth(
      async (user) => {
        try {
          let hashTagProfile;
          const profile = await prisma.profile.findFirst({
              where: {
                userId: userId,
              },
              include: {
                hashtags: {
                  include: {
                    hashtag: true,
                  },
                },
              },
            }),
            hashtagFind = await prisma.hashtag.findFirst({
              where: {
                hashtag: {
                  equals: hashtag,
                },
              },
            });

          if (hashtagFind) {
            console.log("hashtag-find");
            const profileHaveAlreadyHashtag =
              await prisma.hashTagProfile.findFirst({
                where: {
                  profileId: profile.id,
                  hashtagId: hashtagFind.id,
                },
              });

            if (profileHaveAlreadyHashtag) {
              console.log("existe el hashtag en el perfil");
              return {
                success: false,
                errors: "¡Ya has agregado este hashtag!",
              };
            }
            console.log("NO existe el hashtag en el perfil");

            hashTagProfile = await prisma.hashTagProfile.create({
              data: {
                profileId: profile.id,
                hashtagId: hashtagFind.id,
              },
              include: {
                hashtag: {
                  include: {
                    hashtag: true,
                  },
                },
              },
            });
            console.log("hashtag conectado al perfil -> ,", hashTagProfile);
          }

          if (!hashtagFind) {
            console.log("no existe hashtag. creando...");
            hashTagProfile = await prisma.hashtag
              .create({
                data: {
                  hashtag,
                  profiles: {
                    create: {
                      profileId: profile.id,
                    },
                  },
                },
                include: {
                  profiles: {
                    where: {
                      profileId: {
                        equals: profile.id,
                      },
                    },
                  },
                },
              })
              .then((data) => {
                console.log("hashtag creado y conectado al perfil:", data);
                const newData = {
                  ...data.profiles[0],
                  hashtag: {
                    ...data,
                  },
                };
                delete newData.hashtag.profiles;

                return newData;
              });
          }

          if (hashTagProfile)
            return {
              success: true,
              errors: false,
              user: {
                ...user,
                profile: {
                  ...profile,
                  hashtags: [...profile.hashtags, hashTagProfile],
                },
              },
            };
        } catch (e) {
          console.log(e);
          return defaultError;
        }
      },
      (e) => {
        console.log(e);
      },
      context,
      args.input.userId,
      true,
      "creator"
    );
  },
  deleteHashTag: async (parent, args, context) => {
    return await isAuth(
      (user) => {
        try {
          console.log(user);
        } catch (e) {
          return {};
        }
      },
      (e) => {
        console.log(e);
      },
      context,
      args.input.userId,
      true,
      "creator"
    );
  },
};
