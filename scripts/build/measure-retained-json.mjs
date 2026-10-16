import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const chunks = process.argv[2] ?? ".next/server/chunks";
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const artifacts = new Map();
for (const version of ["live", "v1", "v2", "v3", "v4", "v5"]) {
  for (const name of ["pokedex", "scouting"]) {
    const file =
      version === "live"
        ? `src/data/${name}.json`
        : `src/engine/versions/${version}/src/data/${name}.json`;
    const value = JSON.parse(readFileSync(file, "utf8"));
    const key = hash(value);
    const artifact = artifacts.get(key) ?? { names: [], copies: 0, payloadBytes: 0 };
    artifact.names.push(`${version}/${name}`);
    artifacts.set(key, artifact);
  }
}
for (const file of readdirSync(chunks).filter((file) => file.endsWith(".js"))) {
  const source = ts.createSourceFile(
    file,
    readFileSync(path.join(chunks, file), "utf8"),
    ts.ScriptTarget.Latest,
  );
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "JSON.parse" &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const text = node.arguments[0].text;
      let value;
      try {
        value = JSON.parse(text);
      } catch {
        return;
      }
      const artifact = artifacts.get(hash(value));
      if (artifact) {
        artifact.copies += 1;
        artifact.payloadBytes += Buffer.byteLength(text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const payloads = [...artifacts.values()];
if (payloads.some((payload) => payload.copies === 0))
  throw new Error("Build is missing a required artifact payload");
const totalCopies = payloads.reduce((sum, payload) => sum + payload.copies, 0);
assert.equal(totalCopies, Number(process.argv[3] ?? 3), "unexpected emitted data payload count");
console.log(
  JSON.stringify(
    {
      chunks,
      totalCopies: payloads.reduce((sum, p) => sum + p.copies, 0),
      totalPayloadBytes: payloads.reduce((sum, p) => sum + p.payloadBytes, 0),
      payloads,
    },
    null,
    2,
  ),
);
