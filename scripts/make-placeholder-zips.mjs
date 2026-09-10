import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const slugs = [
  "placeholder-iron",
  "placeholder-ember",
  "placeholder-frost",
  "placeholder-hollow",
  "placeholder-nimbus",
  "placeholder-grain",
];

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "downloads");

await mkdir(outDir, { recursive: true });

for (const slug of slugs) {
  const work = path.join(tmpdir(), `18packs-${slug}`);
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  await writeFile(
    path.join(work, "pack.mcmeta"),
    JSON.stringify(
      {
        pack: {
          pack_format: 1,
          description: `Placeholder pack (${slug}) for 1.8packs development`,
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(work, "README.txt"),
    "This archive is a development placeholder for 1.8packs.\nIt is not a finished Minecraft resource pack.\n",
  );

  const zipPath = path.join(outDir, `${slug}.zip`);
  const result = spawnSync("zip", ["-q", "-r", zipPath, "pack.mcmeta", "README.txt"], {
    cwd: work,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `zip failed for ${slug}`);
  }
}

console.log(`Wrote ${slugs.length} placeholder zips to public/downloads`);
