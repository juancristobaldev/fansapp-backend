const isAuth = require("../isAuth");
const { usePrisma, executePrisma } = require("../prisma");
const prisma = usePrisma;

module.exports = {
  addHashTag: async (parent, args, context) => {
    const { hashtag, userId } = args.input;
    let defaultError = {
      errors: "not authorized",
      success: false,
    };

    if (!hashtag || !userId) return defaultError;

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
          });

          return await executePrisma(async () => {
            const data = await prisma.hashtag.findFirst({
              where: {
                hashtag: {
                  equals: hashtag,
                },
              },
            });

            if (data) {
              console.log("hashtag-find");
              const profileHaveAlreadyHashtag =
                await prisma.hashTagProfile.findFirst({
                  where: {
                    profileId: profile.id,
                    hashtagId: data.id,
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
                  hashtagId: data.id,
                },
                include: {
                  hashtag: true,
                },
              });
            } else {
              console.log("no existe hashtag. creando...");
              const newHashtag = await prisma.hashtag.create({
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
              });

              if (newHashtag) {
                console.log(
                  "hashtag creado y conectado al perfil:",
                  newHashtag
                );
                hashTagProfile = {
                  ...newHashtag.profiles[0],
                  hashtag: {
                    ...newHashtag,
                  },
                };
                delete newData.hashtag.profiles;
              }
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
          });
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
    const { userId, idHashtag } = args.input;
    if (!userId || !idHashtag) return {};

    return await isAuth(
      async (user) => {
        console.log(user);
        try {
          return await prisma.hashTagProfile
            .delete({
              where: {
                id: idHashtag,
                profileId: user.profile.id,
              },
            })
            .then(async (data) => {
              console.log(data);

              const hashtagUser = await prisma.hashTagProfile.findMany({
                where: {
                  profileId: user.profile.id,
                  id: {
                    not: idHashtag,
                  },
                },
              });

              return {
                user: {
                  ...user,
                  profile: {
                    ...user.profile,
                    hashtags: hashtagUser.filter(
                      (hashtag) => hashtag.id !== idHashtag
                    ),
                  },
                },
                success: true,
                errors: false,
              };
            });
        } catch (e) {
          console.log(e);
          return {};
        }
      },
      (e) => {
        console.log(e);
        return {
          errors: "not authorized",
          success: false,
        };
      },
      context,
      args.input.userId,
      true,
      "creator"
    );
  },
};
