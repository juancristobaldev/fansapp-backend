const Nope = require("nope-validator");

module.exports = {
  createUserSchema: Nope.object().shape({
    username: Nope.string()
      .atLeast(6, "Too short")
      .atMost(25, "Name is too long!")
      .required("This is required"),
    firstName: Nope.string()
      .atLeast(3, "Too short")
      .atMost(20, "Name is too long!")
      .required("This is required"),
    email: Nope.string()
      .atMost(320, "Is too long")
      .email("The email is not valid")
      .required("This is required"),
    password: Nope.string()
      .atLeast(8, "Too short")
      .atMost(20, "Name is too long!")
      .required("This is required"),
  }),
};
