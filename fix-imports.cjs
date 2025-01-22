const fs = require("fs");
const path = require("path");

function fixImports(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith(".js")) {
      let content = fs.readFileSync(filePath, "utf8");
      content = content.replace(/from "\.\/(.*?)"/g, 'from "./$1.js"');
      fs.writeFileSync(filePath, content, "utf8");
    }
  }
}

fixImports(path.join(__dirname, "dist"));
