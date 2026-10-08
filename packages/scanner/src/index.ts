import {
  validateCodeGraph,
  type CodeEntity,
  type CodeGraph,
  type CodeRelation,
} from '@statecraft/core';
import { createHash } from 'node:crypto';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import {
  isArrowFunction,
  isCallExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isJsxElement,
  isJsxFragment,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isJsxText,
  isNamedImports,
  isNoSubstitutionTemplateLiteral,
  isNumericLiteral,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAssignment,
  isReturnStatement,
  isStringLiteral,
  isVariableStatement,
  type Node,
  type SourceFile,
} from 'typescript/unstable/ast';
import {
  API,
  SymbolFlags,
  type Checker,
  type Project,
} from 'typescript/unstable/sync';

export interface ScanOptions {
  readonly repositoryPath: string;
  readonly repositoryId: string;
  readonly tsconfigPath?: string;
}

export interface ScanDiagnostic {
  readonly code: string;
  readonly filePath: string | null;
  readonly message: string;
}

export interface ScanReport {
  readonly formatVersion: 1;
  readonly analysisProfileId: 'react-ts-v0.1';
  readonly graph: CodeGraph;
  readonly diagnostics: readonly ScanDiagnostic[];
}

interface ComponentRecord {
  readonly entity: CodeEntity;
  readonly declaration: Node;
}

interface CallableRecord {
  readonly entity: CodeEntity;
  readonly declaration: Node;
}

/**
 * Preview profile: finds named JSX components, direct TanStack file routes,
 * and reachable local hooks/functions.
 * The diagnostic makes the still-missing M2 detectors visible to callers.
 */
export function scanRepository(options: ScanOptions): ScanReport {
  const repositoryId = options.repositoryId.trim();
  if (repositoryId.length === 0) {
    throw new Error('Repository ID must not be empty.');
  }

  const repositoryRoot = realpathSync(options.repositoryPath);
  if (!statSync(repositoryRoot).isDirectory()) {
    throw new Error('Repository path must be a directory.');
  }

  const configPath = resolve(
    repositoryRoot,
    options.tsconfigPath ?? 'tsconfig.json',
  );
  if (!isWithin(repositoryRoot, configPath) || !existsSync(configPath)) {
    throw new Error('A tsconfig inside the repository is required.');
  }

  const api = new API({ cwd: repositoryRoot });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [configPath] });
    try {
      const project = snapshot.getProject(configPath);
      if (project === undefined) {
        throw new Error('Could not load the selected TypeScript project.');
      }

      const configDiagnostics =
        project.program.getConfigFileParsingDiagnostics();
      const syntaxDiagnostics = project.program.getSyntacticDiagnostics();
      if (configDiagnostics.length > 0 || syntaxDiagnostics.length > 0) {
        throw new Error(
          'The TypeScript project has configuration or syntax errors.',
        );
      }

      const graph = buildGraph(project, repositoryRoot, repositoryId);
      const issues = validateCodeGraph(graph);
      if (issues.length > 0) {
        throw new Error(
          'Scanner produced an invalid code graph: ' + JSON.stringify(issues),
        );
      }

      return {
        formatVersion: 1,
        analysisProfileId: 'react-ts-v0.1',
        graph,
        diagnostics: [
          {
            code: 'partial_coverage',
            filePath: null,
            message:
              'This preview detects routes, components, and reachable local hooks/functions. Queries, mutations, and HTTP calls are pending.',
          },
        ],
      };
    } finally {
      snapshot.dispose();
    }
  } finally {
    api.close();
  }
}

function buildGraph(
  project: Project,
  repositoryRoot: string,
  repositoryId: string,
): CodeGraph {
  const sourceFiles = [...project.program.getSourceFileNames()]
    .filter((fileName) => isScannable(repositoryRoot, fileName))
    .sort()
    .map((fileName) => project.program.getSourceFile(fileName))
    .filter((file): file is SourceFile => file !== undefined);
  const components: ComponentRecord[] = [];
  const componentsBySymbol = new Map<number, CodeEntity>();

  for (const sourceFile of sourceFiles) {
    for (const statement of sourceFile.statements) {
      if (
        isFunctionDeclaration(statement) &&
        statement.name &&
        statement.body
      ) {
        addComponent(statement.name, statement, statement.body, sourceFile);
      } else if (isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (
            isIdentifier(declaration.name) &&
            declaration.initializer &&
            isArrowFunction(declaration.initializer)
          ) {
            addComponent(
              declaration.name,
              declaration,
              declaration.initializer.body,
              sourceFile,
            );
          }
        }
      }
    }
  }

  function addComponent(
    name: Node & { text: string },
    declaration: Node,
    body: Node,
    sourceFile: SourceFile,
  ) {
    if (!/^[A-Z]/.test(name.text) || !returnsJsx(body)) return;
    const filePath = normalizePath(repositoryRoot, sourceFile.fileName);
    const entity: CodeEntity = {
      id: entityId('component', filePath, name.text),
      kind: 'component',
      name: name.text,
      filePath,
      symbol: name.text,
      structuralHash: structuralHash(declaration),
    };
    components.push({ entity, declaration });
    const symbol = project.checker.getSymbolAtLocation(name);
    if (symbol) componentsBySymbol.set(symbol.id, entity);
  }

  const entities: CodeEntity[] = components.map(
    (component) => component.entity,
  );
  const callablesBySymbol = new Map<number, CallableRecord>();
  for (const sourceFile of sourceFiles) {
    for (const statement of sourceFile.statements) {
      if (isFunctionDeclaration(statement) && statement.name && statement.body) {
        addCallable(statement.name, statement, sourceFile);
      } else if (isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (
            isIdentifier(declaration.name) &&
            declaration.initializer &&
            isArrowFunction(declaration.initializer)
          ) {
            addCallable(declaration.name, declaration, sourceFile);
          }
        }
      }
    }
  }

  function addCallable(
    name: Node & { text: string },
    declaration: Node,
    sourceFile: SourceFile,
  ): void {
    const symbol = project.checker.getSymbolAtLocation(name);
    if (!symbol || componentsBySymbol.has(symbol.id)) return;
    const kind = /^use[A-Z0-9]/.test(name.text) ? 'hook' : 'function';
    const filePath = normalizePath(repositoryRoot, sourceFile.fileName);
    callablesBySymbol.set(symbol.id, {
      entity: {
        id: entityId(kind, filePath, name.text),
        kind,
        name: name.text,
        filePath,
        symbol: name.text,
        structuralHash: structuralHash(declaration),
      },
      declaration,
    });
  }

  const relations: CodeRelation[] = [];
  const relationIds = new Set<string>();

  function addRelation(
    kind: CodeRelation['kind'],
    source: CodeEntity,
    target: CodeEntity,
  ) {
    const id = createHash('sha256')
      .update(JSON.stringify([kind, source.id, target.id]))
      .digest('hex');
    if (relationIds.has(id)) return;
    relationIds.add(id);
    relations.push({
      id,
      kind,
      sourceEntityId: source.id,
      targetEntityId: target.id,
    });
  }

  for (const component of components) {
    visit(component.declaration, (node) => {
      if (!isJsxOpeningElement(node) && !isJsxSelfClosingElement(node)) return;
      const target = resolveComponent(
        node.tagName,
        project.checker,
        componentsBySymbol,
      );
      if (target) addRelation('renders', component.entity, target);
    });
  }

  const includedCallables = new Set<string>();
  function includeCalls(caller: CodeEntity, declaration: Node): void {
    visit(declaration, (node) => {
      if (!isCallExpression(node) || !isIdentifier(node.expression)) return;
      const symbolId = resolveSymbolId(node.expression, project.checker);
      if (symbolId === undefined) return;
      const target = callablesBySymbol.get(symbolId);
      if (!target) return;
      if (!includedCallables.has(target.entity.id)) {
        includedCallables.add(target.entity.id);
        entities.push(target.entity);
        includeCalls(target.entity, target.declaration);
      }
      addRelation(
        target.entity.kind === 'hook' ? 'uses' : 'calls',
        caller,
        target.entity,
      );
    });
  }

  for (const component of components) {
    includeCalls(component.entity, component.declaration);
  }

  for (const sourceFile of sourceFiles) {
    const routeNames = importedNames(
      sourceFile,
      '@tanstack/react-router',
      'createFileRoute',
    );
    if (routeNames.size === 0) continue;
    for (const statement of sourceFile.statements) {
      if (!isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (
          !isIdentifier(declaration.name) ||
          !initializer ||
          !isCallExpression(initializer) ||
          !isCallExpression(initializer.expression)
        )
          continue;

        const factoryCall = initializer.expression;
        if (
          !isIdentifier(factoryCall.expression) ||
          !routeNames.has(factoryCall.expression.text)
        )
          continue;
        const path = factoryCall.arguments[0];
        const options = initializer.arguments[0];
        if (
          !path ||
          !isStringLiteral(path) ||
          !options ||
          !isObjectLiteralExpression(options)
        )
          continue;

        const filePath = normalizePath(repositoryRoot, sourceFile.fileName);
        const route: CodeEntity = {
          id: entityId('route', filePath, declaration.name.text),
          kind: 'route',
          name: path.text,
          filePath,
          symbol: declaration.name.text,
          structuralHash: structuralHash(initializer),
        };
        entities.push(route);

        for (const property of options.properties) {
          if (
            !isPropertyAssignment(property) ||
            !isIdentifier(property.name) ||
            property.name.text !== 'component'
          )
            continue;
          const target = resolveComponent(
            property.initializer,
            project.checker,
            componentsBySymbol,
          );
          if (target) addRelation('renders', route, target);
        }
      }
    }
  }

  entities.sort((left, right) => compareIds(left.id, right.id));
  relations.sort((left, right) => compareIds(left.id, right.id));
  return { repositoryId, entities, relations };
}

function resolveComponent(
  node: Node,
  checker: Checker,
  componentsBySymbol: ReadonlyMap<number, CodeEntity>,
): CodeEntity | undefined {
  if (!isIdentifier(node)) return undefined;
  const symbolId = resolveSymbolId(node, checker);
  return symbolId === undefined ? undefined : componentsBySymbol.get(symbolId);
}

function resolveSymbolId(node: Node, checker: Checker): number | undefined {
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return undefined;
  const resolved =
    symbol.flags & SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  return checker.isUnknownSymbol(resolved) ? undefined : resolved.id;
}

function importedNames(
  sourceFile: SourceFile,
  moduleName: string,
  importedName: string,
): ReadonlySet<string> {
  const names = new Set<string>();
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
      if ((element.propertyName?.text ?? element.name.text) === importedName) {
        names.add(element.name.text);
      }
    }
  }
  return names;
}

function returnsJsx(body: Node): boolean {
  if (isJsxExpression(body)) return true;
  let found = false;
  function inspect(node: Node): void {
    if (found) return;
    if (
      node !== body &&
      (isArrowFunction(node) ||
        isFunctionDeclaration(node) ||
        isFunctionExpression(node))
    )
      return;
    if (
      isReturnStatement(node) &&
      node.expression &&
      isJsxExpression(node.expression)
    ) {
      found = true;
      return;
    }
    node.forEachChild(inspect);
  }
  inspect(body);
  return found;
}

function isJsxExpression(node: Node): boolean {
  if (isParenthesizedExpression(node)) return isJsxExpression(node.expression);
  return (
    isJsxElement(node) || isJsxSelfClosingElement(node) || isJsxFragment(node)
  );
}

function visit(node: Node, callback: (node: Node) => void): void {
  callback(node);
  node.forEachChild((child) => visit(child, callback));
}

function structuralHash(node: Node): string {
  const parts: string[] = [];
  function append(child: Node): void {
    parts.push('(' + child.kind);
    if (
      isIdentifier(child) ||
      isStringLiteral(child) ||
      isNumericLiteral(child) ||
      isNoSubstitutionTemplateLiteral(child) ||
      isJsxText(child)
    ) {
      parts.push(JSON.stringify(child.text));
    }
    child.forEachChild(append);
    parts.push(')');
  }
  append(node);
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function entityId(
  kind: CodeEntity['kind'],
  filePath: string,
  symbol: string,
): string {
  const path = filePath.split('/').map(encodeURIComponent).join('/');
  return kind + ':' + path + '#' + encodeURIComponent(symbol);
}

function normalizePath(repositoryRoot: string, fileName: string): string {
  return relative(repositoryRoot, fileName).split(sep).join('/');
}

function isWithin(repositoryRoot: string, fileName: string): boolean {
  const path = relative(repositoryRoot, fileName);
  return path !== '..' && !path.startsWith('..' + sep) && !path.startsWith(sep);
}

function isScannable(repositoryRoot: string, fileName: string): boolean {
  if (!isWithin(repositoryRoot, fileName)) return false;
  const filePath = normalizePath(repositoryRoot, fileName);
  if (!/\.(ts|tsx)$/.test(filePath) || filePath.endsWith('.d.ts')) return false;
  const segments = filePath.split('/');
  return !segments.some(
    (segment) =>
      segment === 'node_modules' ||
      segment === 'dist' ||
      segment === 'build' ||
      segment === 'coverage',
  );
}
