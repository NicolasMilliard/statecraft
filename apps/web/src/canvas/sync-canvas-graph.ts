import type { CanvasEdge, CanvasNode } from './to-react-flow-graph';

function reuseEqualObject<T extends object>(current: T | undefined, next: T): T {
  if (current === undefined) return next;
  const keys = Object.keys(next) as (keyof T)[];
  const equal = keys.length === Object.keys(current).length &&
    keys.every((key) => current[key] === next[key]);
  return equal ? current : next;
}

function reuseEqualArray<T>(current: T[], next: T[]): T[] {
  return current.length === next.length &&
    next.every((item, index) => item === current[index]) ? current : next;
}

export function syncCanvasNodes(
  current: CanvasNode[],
  next: CanvasNode[],
  nodeToSelect: string | null = null,
): CanvasNode[] {
  const byId = new Map(current.map((node) => [node.id, node]));
  return reuseEqualArray(current, next.map((node) => {
    const previous = byId.get(node.id);
    // Keep measured dimensions and other renderer state when domain data changes.
    const merged = previous === undefined ? node : {
      ...previous,
      ...node,
      data: reuseEqualObject(previous.data, node.data),
      position: reuseEqualObject(previous.position, node.position),
      ...(node.style === undefined ? {} : { style: reuseEqualObject(previous.style, node.style) }),
    };
    const shouldSelect = node.id === nodeToSelect;
    const selected = nodeToSelect !== null && Boolean(merged.selected) !== shouldSelect
      ? { ...merged, selected: shouldSelect }
      : merged;
    return reuseEqualObject(previous, selected);
  }));
}

export function syncCanvasEdges(
  current: CanvasEdge[],
  next: CanvasEdge[],
  clearSelection = false,
): CanvasEdge[] {
  const byId = new Map(current.map((edge) => [edge.id, edge]));
  return reuseEqualArray(current, next.map((edge) => {
    const previous = byId.get(edge.id);
    const merged = previous === undefined ? edge : {
      ...previous,
      ...edge,
      ...(edge.data === undefined ? {} : { data: reuseEqualObject(previous.data, edge.data) }),
    };
    const selected = clearSelection && merged.selected ? { ...merged, selected: false } : merged;
    return reuseEqualObject(previous, selected);
  }));
}
