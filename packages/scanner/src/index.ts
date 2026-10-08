import {
  validateCodeGraph,
  type CodeEntity,
  type CodeGraph,
  type CodeRelation,
  type ScanDiagnostic,
  type ScanReport,
} from '@statecraft/core';
import { createHash } from 'node:crypto';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import {
  isArrayLiteralExpression,
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
  isPropertyAccessExpression,
  isPropertyAssignment,
  isReturnStatement,
  isStringLiteral,
  isVariableStatement,
  type CallExpression,
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

export type { ScanDiagnostic, ScanReport } from '@statecraft/core';

interface ComponentRecord {
  readonly entity: CodeEntity;
  readonly declaration: Node;
}

interface CallableRecord {
  readonly entity: CodeEntity;
  readonly declaration: Node;
}

type HttpCallResult =
  | { readonly kind: 'endpoint'; readonly method: string; readonly url: string }
  | { readonly kind: 'unsupported'; readonly code: string; readonly message: string; readonly countsAsEndpoint: boolean };

/**
 * React/TypeScript profile: finds named JSX components, direct TanStack file routes,
 * reachable local hooks/functions, direct TanStack Query calls, and static
 * fetch/Axios requests.
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

      const diagnostics: ScanDiagnostic[] = [];
      const graph = buildGraph(project, repositoryRoot, repositoryId, diagnostics);
      const issues = validateCodeGraph(graph);
      if (issues.length > 0) {
        throw new Error(
          'Scanner produced an invalid code graph: ' + JSON.stringify(issues),
        );
      }

      return {
        formatVersion: 1,
        analysisProfileId: 'react-ts-v1',
        graph,
        diagnostics: diagnostics.sort((left, right) =>
          compareIds(
            JSON.stringify([left.filePath, left.code, left.message]),
            JSON.stringify([right.filePath, right.code, right.message]),
          ),
        ),
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
  diagnostics: ScanDiagnostic[],
): CodeGraph {
  const sourceFiles = [...project.program.getSourceFileNames()]
    .filter((fileName) => isScannable(repositoryRoot, fileName))
    .sort()
    .map((fileName) => project.program.getSourceFile(fileName))
    .filter((file): file is SourceFile => file !== undefined);
  const components: ComponentRecord[] = [];
  const componentsBySymbol = new Map<number, CodeEntity>();
  const queryImports = new Map<string, ReadonlySet<number>>();
  const mutationImports = new Map<string, ReadonlySet<number>>();
  const axiosImports = new Map<string, ReadonlySet<number>>();
  const routeImports = new Map<string, ReadonlySet<number>>();
  for (const sourceFile of sourceFiles) {
    const filePath = normalizePath(repositoryRoot, sourceFile.fileName);
    queryImports.set(
      filePath,
      importedSymbolIds(sourceFile, '@tanstack/react-query', 'useQuery', project.checker),
    );
    mutationImports.set(
      filePath,
      importedSymbolIds(sourceFile, '@tanstack/react-query', 'useMutation', project.checker),
    );
    axiosImports.set(
      filePath,
      importedDefaultSymbolIds(sourceFile, 'axios', project.checker),
    );
    routeImports.set(
      filePath,
      importedSymbolIds(sourceFile, '@tanstack/react-router', 'createFileRoute', project.checker),
    );
  }

  const axiosInstanceSymbols = new Set<number>();
  for (const sourceFile of sourceFiles) {
    const imports = axiosImports.get(normalizePath(repositoryRoot, sourceFile.fileName));
    for (const statement of sourceFile.statements) {
      if (!isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (
          !isIdentifier(declaration.name) ||
          !initializer ||
          !isCallExpression(initializer) ||
          !isPropertyAccessExpression(initializer.expression) ||
          initializer.expression.name.text !== 'create' ||
          !isIdentifier(initializer.expression.expression)
        ) continue;
        const axiosSymbol = project.checker.getSymbolAtLocation(initializer.expression.expression);
        if (!axiosSymbol || !imports?.has(axiosSymbol.id)) continue;
        const instanceSymbol = project.checker.getSymbolAtLocation(declaration.name);
        if (instanceSymbol) axiosInstanceSymbols.add(instanceSymbol.id);
      }
    }
  }

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
  function includeCallable(target: CallableRecord): void {
    if (includedCallables.has(target.entity.id)) return;
    includedCallables.add(target.entity.id);
    entities.push(target.entity);
    includeCalls(target.entity, target.declaration);
  }

  function includeCalls(caller: CodeEntity, declaration: Node): void {
    let queryOrdinal = 0;
    let mutationOrdinal = 0;
    let endpointOrdinal = 0;
    visit(declaration, (node) => {
      if (!isCallExpression(node)) return;
      const httpCall = inspectHttpCall(
        node,
        project.checker,
        axiosImports.get(caller.filePath),
        axiosInstanceSymbols,
      );
      if (httpCall) {
        if (httpCall.kind === 'unsupported') {
          diagnostics.push({
            code: httpCall.code,
            filePath: caller.filePath,
            message: httpCall.message + ' in ' + caller.name + '.',
          });
          if (httpCall.countsAsEndpoint) endpointOrdinal++;
        } else {
          const entity: CodeEntity = {
            id: entityId('endpoint', caller.filePath, (caller.symbol ?? caller.name) + '/endpoint[' + endpointOrdinal++ + ']'),
            kind: 'endpoint',
            name: httpCall.method + ' ' + httpCall.url,
            filePath: caller.filePath,
            symbol: null,
            structuralHash: structuralHash(node),
          };
          entities.push(entity);
          addRelation('calls', caller, entity);
        }
        return;
      }
      if (!isIdentifier(node.expression)) return;
      const importSymbolId = project.checker.getSymbolAtLocation(node.expression)?.id;
      const kind = importSymbolId !== undefined && queryImports.get(caller.filePath)?.has(importSymbolId)
        ? 'query'
        : importSymbolId !== undefined && mutationImports.get(caller.filePath)?.has(importSymbolId)
          ? 'mutation'
          : undefined;
      if (kind) {
        const ordinal = kind === 'query' ? queryOrdinal++ : mutationOrdinal++;
        const options = node.arguments[0];
        const properties = options && isObjectLiteralExpression(options)
          ? options.properties
          : undefined;
        const directProperties = properties?.every((property) =>
          isPropertyAssignment(property) && isIdentifier(property.name),
        ) ? properties : undefined;
        const functionProperty = kind === 'query' ? 'queryFn' : 'mutationFn';
        const functionReferences = directProperties?.filter((property) =>
          isPropertyAssignment(property) &&
          isIdentifier(property.name) &&
          property.name.text === functionProperty,
        );
        const functionReference = functionReferences?.length === 1
          ? functionReferences[0]
          : undefined;
        const functionNode = functionReference && isPropertyAssignment(functionReference)
          ? functionReference.initializer
          : undefined;
        const functionId = functionNode && isIdentifier(functionNode)
          ? resolveSymbolId(functionNode, project.checker)
          : undefined;
        const target = functionId === undefined ? undefined : callablesBySymbol.get(functionId);
        if (!target) {
          diagnostics.push({
            code: 'unsupported_' + kind + '_options',
            filePath: caller.filePath,
            message: 'Could not resolve the direct ' + functionProperty + ' function in ' + caller.name + '.',
          });
          return;
        }

        const queryKey = directProperties?.find((property) =>
          isPropertyAssignment(property) &&
          isIdentifier(property.name) &&
          property.name.text === 'queryKey',
        );
        const keyValue = queryKey && isPropertyAssignment(queryKey) && isArrayLiteralExpression(queryKey.initializer)
          ? queryKey.initializer.elements.find(isStringLiteral)
          : undefined;
        const name = kind === 'query' && keyValue && isStringLiteral(keyValue)
          ? keyValue.text
          : kind === 'mutation'
            ? target.entity.name
            : caller.name + ' ' + kind + ' ' + ordinal;
        const entity: CodeEntity = {
          id: entityId(kind, caller.filePath, (caller.symbol ?? caller.name) + '/' + kind + '[' + ordinal + ']'),
          kind,
          name,
          filePath: caller.filePath,
          symbol: null,
          structuralHash: structuralHash(node),
        };
        entities.push(entity);
        addRelation('uses', caller, entity);
        includeCallable(target);
        addRelation('calls', entity, target.entity);
        return;
      }
      const symbolId = resolveSymbolId(node.expression, project.checker);
      if (symbolId === undefined) return;
      const target = callablesBySymbol.get(symbolId);
      if (!target) return;
      includeCallable(target);
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
    const filePath = normalizePath(repositoryRoot, sourceFile.fileName);
    const routeSymbols = routeImports.get(filePath);
    if (!routeSymbols || routeSymbols.size === 0) continue;
    for (const statement of sourceFile.statements) {
      if (!isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (
          !isIdentifier(declaration.name) ||
          !initializer ||
          !isCallExpression(initializer)
        )
          continue;

        const factoryCall = isCallExpression(initializer.expression)
          ? initializer.expression
          : initializer;
        if (
          !isIdentifier(factoryCall.expression) ||
          !routeSymbols.has(project.checker.getSymbolAtLocation(factoryCall.expression)?.id ?? -1)
        )
          continue;
        const path = factoryCall.arguments[0];
        if (!path || !isStringLiteral(path)) {
          diagnostics.push({
            code: 'unsupported_route_path',
            filePath,
            message: 'Could not resolve a static path for ' + declaration.name.text + '.',
          });
          continue;
        }

        const options = isCallExpression(initializer.expression)
          ? initializer.arguments[0]
          : undefined;
        if (
          !options ||
          !isObjectLiteralExpression(options) ||
          !options.properties.every((property) =>
            isPropertyAssignment(property) && isIdentifier(property.name),
          )
        ) {
          diagnostics.push({
            code: 'unsupported_route_options',
            filePath,
            message: 'Could not resolve direct route options for ' + declaration.name.text + '.',
          });
          continue;
        }

        const componentProperties = options.properties.filter((property) =>
          isPropertyAssignment(property) &&
          isIdentifier(property.name) &&
          property.name.text === 'component',
        );
        const componentProperty = componentProperties.length === 1
          ? componentProperties[0]
          : undefined;
        const component = componentProperty && isPropertyAssignment(componentProperty)
          ? resolveComponent(
              componentProperty.initializer,
              project.checker,
              componentsBySymbol,
            )
          : undefined;
        if (!component) {
          diagnostics.push({
            code: 'unsupported_route_component',
            filePath,
            message: 'Could not resolve a local component for ' + declaration.name.text + '.',
          });
          continue;
        }

        const route: CodeEntity = {
          id: entityId('route', filePath, declaration.name.text),
          kind: 'route',
          name: path.text,
          filePath,
          symbol: declaration.name.text,
          structuralHash: structuralHash(initializer),
        };
        entities.push(route);
        addRelation('renders', route, component);
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

function importedSymbolIds(
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

function importedDefaultSymbolIds(
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

function inspectHttpCall(
  call: CallExpression,
  checker: Checker,
  axiosSymbols: ReadonlySet<number> | undefined,
  axiosInstanceSymbols: ReadonlySet<number>,
): HttpCallResult | undefined {
  const expression = call.expression;
  const isGlobalFetch = isGlobalIdentifier(expression, 'fetch', checker) ||
    (isPropertyAccessExpression(expression) &&
      expression.name.text === 'fetch' &&
      isGlobalIdentifier(expression.expression, 'globalThis', checker));
  if (isGlobalFetch) return inspectFetchCall(call);
  if (isIdentifier(expression)) {
    const symbolId = checker.getSymbolAtLocation(expression)?.id;
    if (symbolId !== undefined && axiosSymbols?.has(symbolId)) {
      return {
        kind: 'unsupported',
        code: 'unsupported_axios_call',
        message: 'Direct axios invocation is not supported',
        countsAsEndpoint: false,
      };
    }
  }

  if (isPropertyAccessExpression(expression) && isIdentifier(expression.expression)) {
    const symbolId = checker.getSymbolAtLocation(expression.expression)?.id;
    const resolvedId = resolveSymbolId(expression.expression, checker);
    if (resolvedId !== undefined && axiosInstanceSymbols.has(resolvedId)) {
      return {
        kind: 'unsupported',
        code: 'unsupported_axios_instance',
        message: 'Axios instance calls are not supported',
        countsAsEndpoint: false,
      };
    }
    if (symbolId === undefined || !axiosSymbols?.has(symbolId)) return undefined;
    const method = expression.name.text.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
      return {
        kind: 'unsupported',
        code: 'unsupported_axios_call',
        message: 'Only direct Axios HTTP methods are supported',
        countsAsEndpoint: false,
      };
    }
    const url = staticText(call.arguments[0]);
    return url
      ? { kind: 'endpoint', method, url }
      : {
          kind: 'unsupported',
          code: 'dynamic_http_url',
          message: 'Could not resolve a static Axios URL',
          countsAsEndpoint: true,
        };
  }
  return undefined;
}

function inspectFetchCall(call: CallExpression): HttpCallResult {
  const url = staticText(call.arguments[0]);
  if (!url) {
    return {
      kind: 'unsupported',
      code: 'dynamic_http_url',
      message: 'Could not resolve a static fetch URL',
      countsAsEndpoint: true,
    };
  }
  const options = call.arguments[1];
  let method = 'GET';
  if (options) {
    if (
      !isObjectLiteralExpression(options) ||
      !options.properties.every((property) =>
        isPropertyAssignment(property) && isIdentifier(property.name),
      )
    ) {
      return {
        kind: 'unsupported',
        code: 'unsupported_fetch_options',
        message: 'Could not resolve direct fetch options',
        countsAsEndpoint: true,
      };
    }
    const methodProperties = options.properties.filter((property) =>
      isPropertyAssignment(property) &&
      isIdentifier(property.name) &&
      property.name.text === 'method',
    );
    if (methodProperties.length > 1) {
      return {
        kind: 'unsupported',
        code: 'unsupported_fetch_options',
        message: 'Could not resolve a unique fetch method',
        countsAsEndpoint: true,
      };
    }
    if (methodProperties.length === 1) {
      const property = methodProperties[0];
      const staticMethod = property && isPropertyAssignment(property)
        ? staticText(property.initializer)
        : undefined;
      if (!staticMethod || !/^[A-Za-z]+$/.test(staticMethod)) {
        return {
          kind: 'unsupported',
          code: 'unsupported_fetch_options',
          message: 'Could not resolve a static fetch method',
          countsAsEndpoint: true,
        };
      }
      method = staticMethod.toUpperCase();
    }
  }
  return { kind: 'endpoint', method, url };
}

function isGlobalIdentifier(node: Node, name: string, checker: Checker): boolean {
  return isIdentifier(node) &&
    node.text === name &&
    checker.getSymbolAtLocation(node) !== undefined &&
    checker.resolveName(name, SymbolFlags.Value, node, true) === undefined;
}

function staticText(node: Node | undefined): string | undefined {
  return node && (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
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
  if (
    !/\.(ts|tsx)$/.test(filePath) ||
    filePath.endsWith('.d.ts') ||
    /\.(gen|generated)\.(ts|tsx)$/.test(filePath)
  ) return false;
  const segments = filePath.split('/');
  return !segments.some(
    (segment) =>
      segment === 'node_modules' ||
      segment === 'dist' ||
      segment === 'build' ||
      segment === 'coverage' ||
      segment === 'generated' ||
      segment === '__generated__' ||
      segment === '.next',
  );
}
