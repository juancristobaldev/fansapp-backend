const bcrypt = require("bcrypt");
const saltRounds = 10;

const encryptPassword = async (plainPassword) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);

    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    return hashedPassword;
  } catch (error) {
    throw error;
  }
};

module.exports = { encryptPassword };
