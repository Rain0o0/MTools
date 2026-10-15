import { readFile, writeFile } from 'node:fs/promises';
import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';

const api = JSON.parse(
  await readFile(new URL('../openapi.json', import.meta.url), 'utf8'),
);
const names = [
  'Catalog',
  'CatalogEntry',
  'Capabilities',
  'ErrorResponse',
  'JsonResult',
  'SessionInfo',
  'Health',
  'Preferences',
  'AiConnection',
];
const ajv = new Ajv({
  strict: false,
  code: { source: true, esm: true, lines: true },
});
ajv.addSchema({ $id: 'mtools', components: api.components });
const references = Object.fromEntries(
  names.map((name) => [name, `mtools#/components/schemas/${name}`]),
);
const header =
  '// Generated from openapi.json by scripts/generate-validators.mjs. Do not edit.\n';
const outputs = {
  'validators.js': header + standaloneCode(ajv, references) + '\n',
  'validators.d.ts':
    header +
    "import type { ValidateFunction } from 'ajv';\nimport type { components } from './api';\n" +
    names
      .map(
        (name) =>
          `export const ${name}: ValidateFunction<components['schemas']['${name}']>;`,
      )
      .join('\n') +
    '\n',
};
for (const [name, content] of Object.entries(outputs)) {
  const destination = new URL(`../src/generated/${name}`, import.meta.url);
  if (process.argv.includes('--check')) {
    if ((await readFile(destination, 'utf8')) !== content)
      throw new Error(`${name} is out of date`);
  } else {
    await writeFile(destination, content, 'utf8');
  }
}
