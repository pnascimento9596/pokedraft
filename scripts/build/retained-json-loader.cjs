/* eslint-disable @typescript-eslint/no-require-imports -- Turbopack loads a CommonJS webpack loader. */
const { existsSync, readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const versionOf = (name) => Number(/^v(\d+)$/.exec(name)?.[1]);

function candidates(rootContext, resourcePath) {
  const basename = path.basename(resourcePath);
  const versionsDir = path.join(rootContext, "src/engine/versions");
  const own = versionOf(path.basename(path.dirname(path.dirname(path.dirname(resourcePath)))));
  const earlier = readdirSync(versionsDir)
    .filter((name) => versionOf(name) < own)
    .sort((a, b) => versionOf(a) - versionOf(b))
    .map((name) => path.join(versionsDir, name, "src/data", basename))
    .filter((file) => existsSync(file));
  return [path.join(rootContext, "src/data", basename), ...earlier];
}

module.exports = function retainedJsonLoader(source) {
  const text = source.toString("utf8");
  JSON.parse(text);
  for (const candidate of candidates(this.rootContext, this.resourcePath)) {
    this.addDependency(candidate);
    if (source.equals(readFileSync(candidate))) {
      const relative = path
        .relative(path.dirname(this.resourcePath), candidate)
        .split(path.sep)
        .join("/");
      return `export { default } from ${JSON.stringify(relative)};\n`;
    }
  }
  return `export default JSON.parse(${JSON.stringify(text)});\n`;
};

module.exports.raw = true;
