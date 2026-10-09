import fs from "node:fs";
for (const dir of ["_site", "_offline", ".cache"]) fs.rmSync(dir, { recursive: true, force: true });
