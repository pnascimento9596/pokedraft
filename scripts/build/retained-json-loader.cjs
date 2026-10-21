/* eslint-disable @typescript-eslint/no-require-imports -- Turbopack loads a CommonJS webpack loader. */
const { existsSync, readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const versionOf = (name) => Number(/^v(\d+)$/.exec(name)?.[1]);

function candidates(rootContext, resourcePath) {
  const versionsDir = path.join(rootContext, "src/engine/versions");
  const isBlob =
    path.dirname(resourcePath).endsWith(path.join("src", "engine", "versions", "_blobs")) ||
    path.basename(path.dirname(resourcePath)) === "_blobs";
  if (isBlob) {
    return [
      path.join(rootContext, "src/data/pokedex.json"),
      path.join(rootContext, "src/data/scouting.json"),
      path.join(rootContext, "src/data/type-chart.json"),
      path.join(rootContext, "scripts/data/move-traits.json"),
    ].filter((f) => existsSync(f));
  }
  const basename = path.basename(resourcePath);
  const own = versionOf(path.basename(path.dirname(path.dirname(path.dirname(resourcePath)))));
  const earlier = existsSync(versionsDir)
    ? readdirSync(versionsDir)
        .filter((name) => versionOf(name) < own)
        .sort((a, b) => versionOf(a) - versionOf(b))
        .map((name) => path.join(versionsDir, name, "src/data", basename))
        .filter((file) => existsSync(file))
    : [];
  return [path.join(rootContext, "src/data", basename), ...earlier].filter((f) => existsSync(f));
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
