const crypto = require("crypto");

module.exports = {
  v4: () => crypto.randomUUID(),
  validate: (str) =>
    typeof str === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str),
};
