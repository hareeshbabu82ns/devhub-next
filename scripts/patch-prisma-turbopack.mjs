import fs from "fs";
import path from "path";

const indexFile = path.join(process.cwd(), "src/app/generated/prisma/index.js");
if (fs.existsSync(indexFile)) {
  let content = fs.readFileSync(indexFile, "utf8");
  if (!content.includes("/*turbopackIgnore: true*/")) {
    content = content.replace(
      "config.dirname = path.join(process.cwd(), alternativePath)",
      "config.dirname = path.join(/*turbopackIgnore: true*/ process.cwd(), alternativePath)"
    );
    fs.writeFileSync(indexFile, content, "utf8");
  }
}

const libFile = path.join(process.cwd(), "src/app/generated/prisma/runtime/library.js");
if (fs.existsSync(libFile)) {
  let content = fs.readFileSync(libFile, "utf8");
  if (!content.includes("/*turbopackIgnore: true*/")) {
    content = content.replace(
      'Mi.resolve(process.cwd(),".env.vault");return Fi.existsSync(r)?r:null',
      'Mi.resolve(process.cwd(),".env.vault");return Fi.existsSync(/*turbopackIgnore: true*/ r)?r:null'
    );
    fs.writeFileSync(libFile, content, "utf8");
  }
}
