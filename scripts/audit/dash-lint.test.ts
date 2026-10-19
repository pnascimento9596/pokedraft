import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lintDashes, lintSource } from "./dash-lint.mjs";

const EM = "—";
const EN = "–";

describe("lintSource (catches an em or en dash reaching user-facing copy)", () => {
  it("flags an em dash in a string literal with its line", () => {
    expect(lintSource("a.ts", `const a = 1;\nconst b = "Win ${EM} 1-0";\n`)).toEqual([
      "a.ts:2: em or en dash in copy",
    ]);
  });

  it("flags an en dash in a template literal and in JSX text", () => {
    expect(
      lintSource(
        "b.tsx",
        `const t = \`\${x} ${EN} \${y}\`;\nexport const C = () => <p>A ${EM} B</p>;\n`,
      ),
    ).toEqual(["b.tsx:1: em or en dash in copy", "b.tsx:2: em or en dash in copy"]);
  });

  it("flags the escapes and the HTML entities", () => {
    expect(
      lintSource(
        "c.tsx",
        [
          'const a = "x \\u2014 y";',
          "const b = `x \\u2013 y`;",
          "export const C = () => <p>A &mdash; B</p>;",
          'export const D = () => <p title="A &ndash; B">x</p>;',
        ].join("\n"),
      ),
    ).toEqual([
      "c.tsx:1: em or en dash in copy",
      "c.tsx:2: em or en dash in copy",
      "c.tsx:3: em or en dash in copy",
      "c.tsx:4: em or en dash in copy",
    ]);
  });

  it("ignores comments, a regex literal and a plain hyphen score", () => {
    expect(
      lintSource(
        "d.ts",
        `// a note ${EM} not copy\nconst r = /${EM}/;\nconst s = "1-0";\n/* ${EN} */\n`,
      ),
    ).toEqual([]);
  });

  it("flags a CSS content value and ignores a CSS comment", () => {
    expect(
      lintSource(
        "e.css",
        `/* ${EM} */\n.a::before { content: "${EM}"; }\n.b::after { content: "\\2013"; }\n`,
      ),
    ).toEqual(["e.css:2: em or en dash in copy", "e.css:3: em or en dash in copy"]);
  });

  it("passes src/scouting/review.ts, whose em dash is the regex that forbids em dashes", () => {
    const file = path.resolve(import.meta.dirname, "../../src/scouting/review.ts");
    const text = readFileSync(file, "utf8");
    expect(text.includes(EM)).toBe(true);
    expect(lintSource("scouting/review.ts", text)).toEqual([]);
  });
});

describe("lintDashes (catches a dash in a linted file or a frozen copy that fails the build)", () => {
  let root = "";
  const write = (rel: string, body: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  };
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "dash-lint-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reports an em dash in a component and skips tests and engine version copies", () => {
    write("components/A.tsx", `export const A = () => <p>Hi ${EM} there</p>;\n`);
    write("components/__tests__/A.test.tsx", `expect(x).not.toContain("${EM}");\n`);
    write("components/B.test.ts", `const s = "${EM}";\n`);
    write("engine/versions/v1/src/x.ts", `const s = "${EM}";\n`);
    write("styles/a.css", `.a::before { content: "${EN}"; }\n`);
    expect(lintDashes(root)).toEqual([
      "components/A.tsx:1: em or en dash in copy",
      "styles/a.css:1: em or en dash in copy",
    ]);
  });

  it("finds no dash in the repository's src today", () => {
    expect(lintDashes(path.resolve(import.meta.dirname, "../../src"))).toEqual([]);
  });
});
