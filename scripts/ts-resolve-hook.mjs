import path from "node:path";

// Node's type stripper does not add .ts to extensionless relative imports.
// Next compiles those imports, so this hook is only for the test command.
export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
