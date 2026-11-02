const path = require("path");
const fs = require("fs");

const shimsDir = path.join(__dirname, "shims");
if (!fs.existsSync(shimsDir)) {
  fs.mkdirSync(shimsDir, { recursive: true });
}

module.exports = (request, options) => {
  if (request.startsWith("node:")) {
    const builtinName = request.slice(5);
    const shimPath = path.join(shimsDir, `${builtinName}.js`);
    if (!fs.existsSync(shimPath)) {
      fs.writeFileSync(shimPath, `module.exports = require('${builtinName}');\n`);
    }
    return shimPath;
  }

  if (request === "uuid") {
    return path.join(shimsDir, "uuid.js");
  }

  try {
    return options.defaultResolver(request, options);
  } catch (e) {
    try {
      return require.resolve(request, { paths: [options.basedir] });
    } catch (_) {
      throw e;
    }
  }
};
