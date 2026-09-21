import { FlowCanvas } from './canvas/FlowCanvas';
import { checkoutFlow, checkoutLayout } from './examples/checkout';

export default function App() {
  return (
    <main className="grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-7 py-5">
        <div>
          <p className="mb-1.5 text-[13px] font-bold text-brand">Statecraft</p>
          <h1 className="text-2xl font-bold">{checkoutFlow.name}</h1>
        </div>

        <p className="text-[13px] text-slate-500">
          Example flow · {checkoutFlow.nodes.length} nodes ·{' '}
          {checkoutFlow.edges.length} connections
        </p>
      </header>

      <FlowCanvas flow={checkoutFlow} layout={checkoutLayout} />
    </main>
  );
}
