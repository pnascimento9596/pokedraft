/* eslint-disable @typescript-eslint/no-require-imports -- Turbopack loads a CommonJS webpack loader. */
const { readFileSync } = require("node:fs");
const path = require("node:path");

module.exports = function retainedJsonLoader(source) {
  const text = source.toString("utf8");
  JSON.parse(text);
  const canonical = path.join(this.rootContext, "src/data", path.basename(this.resourcePath));
  this.addDependency(canonical);
  if (source.equals(readFileSync(canonical))) {
    const relative = path
      .relative(path.dirname(this.resourcePath), canonical)
      .split(path.sep)
      .join("/");
    return `export { default } from ${JSON.stringify(relative)};\n`;
  }
  return `export default JSON.parse(${JSON.stringify(text)});\n`;
};

module.exports.raw = true;
