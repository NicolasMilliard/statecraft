import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { syncCanvasEdges, syncCanvasNodes } from '../src/canvas/sync-canvas-graph.ts';
import { toReactFlowGraph } from '../src/canvas/to-react-flow-graph.ts';
import { parseFlowDocument } from '../src/editor/flow-document.ts';

const editor = parseFlowDocument(readFileSync(new URL('./fixtures/dense-100.statecraft.json', import.meta.url), 'utf8'));
const nodeId = 'node-04-03';

test('keeps unchanged arrays and renderer state when the graph is rebuilt', () => {
  const current = toReactFlowGraph(editor.flow, editor.layout);
  current.nodes[0] = { ...current.nodes[0]!, selected: true, dragging: false, measured: { width: 192, height: 80 } };
  current.edges[0] = { ...current.edges[0]!, selected: true };
  const next = toReactFlowGraph({ ...editor.flow, name: 'Renamed flow' }, editor.layout);
  assert.equal(current.nodes.length, 100);
  assert.equal(current.edges.length, 144);
  assert.strictEqual(syncCanvasNodes(current.nodes, next.nodes), current.nodes);
  assert.strictEqual(syncCanvasEdges(current.edges, next.edges), current.edges);
});

test('a rename updates only its node and the accessible labels of adjacent edges', () => {
  const current = toReactFlowGraph(editor.flow, editor.layout);
  const next = toReactFlowGraph({ ...editor.flow, nodes: editor.flow.nodes.map(node => node.id === nodeId ? { ...node, label: 'POST /checkout' } : node) }, editor.layout);
  const nodes = syncCanvasNodes(current.nodes, next.nodes);
  const edges = syncCanvasEdges(current.edges, next.edges);
  assert.equal(nodes.filter((node, i) => node !== current.nodes[i]).length, 1);
  assert.equal(edges.filter((edge, i) => edge !== current.edges[i]).length, 2);
  assert.equal(nodes.find(node => node.id === nodeId)?.data.label, 'POST /checkout');
  for (const [i, edge] of edges.entries()) {
    assert.strictEqual(edge.data, current.edges[i]!.data);
    if (edge.source === nodeId || edge.target === nodeId) assert.match(edge.ariaLabel!, /POST \/checkout/);
  }
});

test('moving and undoing a node keeps node data and all edges stable', () => {
  const original = toReactFlowGraph(editor.flow, editor.layout);
  const layout = { ...editor.layout, positions: { ...editor.layout.positions, [nodeId]: { x: 900, y: 720 } } };
  const next = toReactFlowGraph(editor.flow, layout);
  const moved = syncCanvasNodes(original.nodes, next.nodes);
  assert.equal(moved.filter((node, i) => node !== original.nodes[i]).length, 1);
  moved.forEach((node, i) => assert.strictEqual(node.data, original.nodes[i]!.data));
  assert.strictEqual(syncCanvasEdges(original.edges, next.edges), original.edges);
  const restored = syncCanvasNodes(moved, original.nodes);
  assert.deepEqual(restored, original.nodes);
});

test('adding selects only the new node and clears edge selection without discarding dimensions', () => {
  const current = toReactFlowGraph(editor.flow, editor.layout);
  current.nodes[0] = { ...current.nodes[0]!, selected: true, measured: { width: 192, height: 80 } };
  current.edges[0] = { ...current.edges[0]!, selected: true };
  const flow = { ...editor.flow, nodes: [...editor.flow.nodes, { id: 'new-node', kind: 'screen' as const, label: 'New screen' }] };
  const layout = { ...editor.layout, positions: { ...editor.layout.positions, 'new-node': { x: 3000, y: 0 } } };
  const next = toReactFlowGraph(flow, layout);
  const nodes = syncCanvasNodes(current.nodes, next.nodes, 'new-node');
  const edges = syncCanvasEdges(current.edges, next.edges, true);
  assert.deepEqual(nodes.filter(node => node.selected).map(node => node.id), ['new-node']);
  assert.strictEqual(nodes[0]!.measured, current.nodes[0]!.measured);
  assert.strictEqual(nodes[1], current.nodes[1]);
  assert.equal(edges.some(edge => edge.selected), false);
  assert.strictEqual(edges[1], current.edges[1]);
});

test('entry changes and removals propagate without keeping stale elements', () => {
  const current = toReactFlowGraph(editor.flow, editor.layout);
  const next = toReactFlowGraph({ ...editor.flow, entryNodeId: nodeId, nodes: editor.flow.nodes.filter(node => node.id !== 'node-09-09'), edges: editor.flow.edges.filter(edge => edge.sourceNodeId !== 'node-09-09' && edge.targetNodeId !== 'node-09-09') }, editor.layout);
  const nodes = syncCanvasNodes(current.nodes, next.nodes);
  const edges = syncCanvasEdges(current.edges, next.edges);
  assert.equal(nodes.length, 99);
  assert.equal(nodes[0]!.data.isEntry, false);
  assert.equal(nodes.find(node => node.id === nodeId)?.data.isEntry, true);
  assert.match(nodes.find(node => node.id === nodeId)!.ariaLabel!, /entry point/);
  assert.equal(edges.some(edge => edge.source === 'node-09-09' || edge.target === 'node-09-09'), false);
});
