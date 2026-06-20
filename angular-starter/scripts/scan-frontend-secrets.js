const fs = require('fs');
const path = require('path');

const root = process.cwd();
const scanRoots = ['src', 'scripts', 'package.json', 'angular.json', 'firebase.json', '.env.example'];
const ignoredDirs = new Set(['node_modules', 'dist', '.angular', 'coverage', '.git']);

const checks = [
  { name: 'Firebase API key', pattern: /AIza[0-9A-Za-z_-]{20,}/g },
  { name: 'Groq API key', pattern: /gsk_[0-9A-Za-z_-]{20,}/g },
  { name: 'OpenAI API key', pattern: /sk-[0-9A-Za-z]{20,}/g },
  { name: 'JWT-like token', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g }
];

function walk(targetPath, files) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const dirName = path.basename(targetPath);
    if (ignoredDirs.has(dirName)) return;

    for (const entry of fs.readdirSync(targetPath)) {
      walk(path.join(targetPath, entry), files);
    }
    return;
  }

  if (stat.isFile()) {
    files.push(targetPath);
  }
}

const files = [];
for (const scanRoot of scanRoots) {
  walk(path.resolve(root, scanRoot), files);
}

const findings = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const check of checks) {
    check.pattern.lastIndex = 0;
    if (check.pattern.test(content)) {
      findings.push({
        file: path.relative(root, file),
        type: check.name
      });
    }
  }
}

if (findings.length > 0) {
  console.error('Potential frontend secrets found:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.type}`);
  }
  process.exit(1);
}

console.log('No frontend secrets found in tracked source paths.');
