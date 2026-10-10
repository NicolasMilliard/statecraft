import {
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isStringLiteral,
  type CallExpression,
  type Node,
} from 'typescript/unstable/ast';
import { SymbolFlags, type Checker } from 'typescript/unstable/sync';
import { resolveSymbolId } from './symbols.js';

type HttpCallResult =
  | { readonly kind: 'endpoint'; readonly method: string; readonly url: string }
  | { readonly kind: 'unsupported'; readonly code: string; readonly message: string; readonly countsAsEndpoint: boolean };

export function inspectHttpCall(
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

