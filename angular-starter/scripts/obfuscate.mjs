/**
 * scripts/obfuscate.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * Post-build JavaScript obfuscation step.
 *
 * Runs AFTER `ng build --configuration production` and applies
 * javascript-obfuscator to every *.js file in dist/.
 *
 * What this adds on top of Angular's built-in Terser minification:
 *   • String array encoding + rotation (literal strings hidden)
 *   • Control-flow flattening (logic flow made unreadable)
 *   • Dead-code injection (adds fake code paths to confuse reversers)
 *   • Self-defending code (breaks if reformatted)
 *   • Identifier hex mangling (var names → _0x1a2b3c style)
 *
 * Usage:
 *   node scripts/obfuscate.mjs               ← uses default dist path
 *   DIST_DIR=dist/my-app node scripts/obfuscate.mjs
 *
 * Called automatically by:
 *   npm run build:secure
 * ──────────────────────────────────────────────────────────────────────────
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = process.env['DIST_DIR']
  ?? resolve(__dirname, '../dist/angular-starter');

/** javascript-obfuscator options — balanced between protection and performance */
const OBFUSCATOR_OPTIONS = {
  compact:                          true,   // remove whitespace
  selfDefending:                    true,   // breaks if prettified
  stringArray:                      true,   // move literal strings to encoded array
  stringArrayEncoding:              ['base64'],
  stringArrayThreshold:             0.75,   // encode 75% of strings
  stringArrayRotate:                true,
  stringArrayShuffle:               true,
  splitStrings:                     true,
  splitStringsChunkLength:          10,
  controlFlowFlattening:            true,
  controlFlowFlatteningThreshold:   0.4,    // 40% of blocks (higher = slower)
  deadCodeInjection:                true,
  deadCodeInjectionThreshold:       0.2,
  renameGlobals:                    false,  // keep Angular module names to avoid runtime errors
  identifierNamesGenerator:         'hexadecimal',
  transformObjectKeys:              false,  // can break Angular object literals
  unicodeEscapeSequence:            false,  // makes files extremely large
  disableConsoleOutput:             false,  // keep console.log (useful for warnings)
  debugProtection:                  false,  // causes infinite loop on breakpoint — too aggressive
  sourceMap:                        false,
};

/** Recursively find all .js files in a directory */
function findJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findJsFiles(full));
    } else if (extname(entry) === '.js') {
      results.push(full);
    }
  }
  return results;
}

console.log(`\n🔒 Post-build obfuscation starting…`);
console.log(`   dist: ${DIST_DIR}\n`);

const files = findJsFiles(DIST_DIR);

if (files.length === 0) {
  console.error('❌ No JS files found. Run `npm run build` first.');
  process.exit(1);
}

let ok = 0, fail = 0;

for (const file of files) {
  const originalSize = statSync(file).size;
  try {
    const src = readFileSync(file, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(src, OBFUSCATOR_OPTIONS);
    writeFileSync(file, result.getObfuscatedCode(), 'utf8');
    const newSize = statSync(file).size;
    const ratio = ((newSize / originalSize) * 100).toFixed(0);
    console.log(`   ✅ ${file.split('dist')[1]}  (${ratio}% of original)`);
    ok++;
  } catch (err) {
    // Some vendor chunks may fail — log and continue rather than aborting
    console.warn(`   ⚠️  Skipped ${file.split('dist')[1]}: ${err.message}`);
    fail++;
  }
}

console.log(`\n🔒 Obfuscation complete: ${ok} files obfuscated, ${fail} skipped.\n`);
