import { readdir, readFile, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoots = ['apps', 'packages'];
const packages = new Map();
const errors = [];

for (const parent of packageRoots) {
  for (const name of await readdir(join(root, parent))) {
    const directory = join(root, parent, name);
    let manifest;
    try {
      manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue; // Schema and design-only directories are not workspace packages.
      errors.push(`${parent}/${name}: invalid package manifest`);
      continue;
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push(`${parent}/${name}: package name is missing`);
      continue;
    }
    if (packages.has(manifest.name)) errors.push(`${manifest.name}: duplicate workspace package name`);
    packages.set(manifest.name, { directory, manifest });
  }
}

for (const [name, { directory, manifest }] of packages) {
  for (const [dependency, version] of Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.optionalDependencies,
  })) {
    if (version.startsWith('workspace:') && !packages.has(dependency)) {
      errors.push(`${name}: workspace dependency ${dependency} has no package manifest`);
    }
  }

  for (const [exportName, target] of Object.entries(manifest.exports ?? {})) {
    for (const kind of ['types', 'import', 'require', 'default']) {
      const file = target?.[kind];
      if (typeof file !== 'string') continue;
      const absolute = resolve(directory, file);
      const rel = relative(directory, absolute);
      if (rel.startsWith('..') || absolute === directory) {
        errors.push(`${name} ${exportName}: export ${kind} points outside the package`);
        continue;
      }
      // Build outputs may not exist during the clean install job. Require the source package and build script.
      if (!manifest.scripts?.build) errors.push(`${name} ${exportName}: generated export has no build script`);
    }
  }

  try {
    const actual = await realpath(directory);
    if (actual !== directory) errors.push(`${name}: package directory resolves outside its workspace path`);
  } catch {
    errors.push(`${name}: package directory cannot be resolved`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Workspace graph valid: ${packages.size} packages; workspace dependencies and export build targets are declared.`);
}
