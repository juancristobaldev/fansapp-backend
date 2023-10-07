const { google } = require("googleapis");

const getDataPeopleApi = async (accessToken, oauth2Client) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const people = google.people({ version: "v1", auth: oauth2Client });

  const response = await people.people.get({
    resourceName: "people/me",
    personFields: "genders,birthdays",
  });

  const { birthdays, genders } = response.data;

  const variables = {
    birthday: birthdays
      ? `${
          birthdays[0].date.day > 9
            ? birthdays[0].date.day
            : `0${birthdays[0].date.day}`
        }-${
          birthdays[0].date.month > 9
            ? birthdays[0].date.month
            : `0${birthdays[0].date.month}`
        }-${birthdays[0].date.year}`
      : null,
    gender: genders ? genders[0].value : "undefined",
  };

  return variables;
};

module.exports = { getDataPeopleApi };
