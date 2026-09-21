import { FlowCanvas } from './canvas/FlowCanvas';
import { checkoutFlow, checkoutLayout } from './examples/checkout';

export default function App() {
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="brand">Statecraft</p>
          <h1>{checkoutFlow.name}</h1>
        </div>

        <p className="workspace-summary">
          Example flow · {checkoutFlow.nodes.length} nodes ·{' '}
          {checkoutFlow.edges.length} connections
        </p>
      </header>

      <FlowCanvas flow={checkoutFlow} layout={checkoutLayout} />
    </main>
  );
}
