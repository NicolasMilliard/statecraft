import {
  isImportDeclaration,
  isNamedImports,
  isStringLiteral,
  type Node,
  type SourceFile,
} from 'typescript/unstable/ast';
import { SymbolFlags, type Checker } from 'typescript/unstable/sync';

export function resolveSymbolId(node: Node, checker: Checker): number | undefined {
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return undefined;
  const resolved =
    symbol.flags & SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  return checker.isUnknownSymbol(resolved) ? undefined : resolved.id;
}

export function importedSymbolIds(
  sourceFile: SourceFile,
  moduleName: string,
  importedName: string,
  checker: Checker,
): ReadonlySet<number> {
  const ids = new Set<number>();
  for (const statement of sourceFile.statements) {
    if (
      !isImportDeclaration(statement) ||
      !isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== moduleName
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if ((element.propertyName?.text ?? element.name.text) !== importedName) continue;
      const symbol = checker.getSymbolAtLocation(element.name);
      if (symbol) ids.add(symbol.id);
    }
  }
  return ids;
}

export function importedDefaultSymbolIds(
  sourceFile: SourceFile,
  moduleName: string,
  checker: Checker,
): ReadonlySet<number> {
  const ids = new Set(importedSymbolIds(sourceFile, moduleName, 'default', checker));
  for (const statement of sourceFile.statements) {
    if (
      !isImportDeclaration(statement) ||
      !isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== moduleName
    )
      continue;
    const name = statement.importClause?.name;
    if (!name) continue;
    const symbol = checker.getSymbolAtLocation(name);
    if (symbol) ids.add(symbol.id);
  }
  return ids;
}

