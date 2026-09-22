import { useState } from 'react';
import { FlowCanvas } from './canvas/FlowCanvas';
import type { FlowLayout } from './canvas/flow-layout';
import { checkoutFlow, checkoutLayout } from './examples/checkout';

export default function App() {
  const [layout, setLayout] = useState<FlowLayout>(checkoutLayout);

  return (
    <main className="grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-7 py-5">
        <div>
          <p className="mb-1.5 text-[13px] font-bold text-brand">Statecraft</p>
          <h1 className="text-2xl font-bold">{checkoutFlow.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-[13px] text-slate-500">
            Example flow · {checkoutFlow.nodes.length} nodes ·{' '}
            {checkoutFlow.edges.length} connections
          </p>

          <button
            type="button"
            onClick={() => setLayout(checkoutLayout)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Reset layout
          </button>
        </div>
      </header>

      <FlowCanvas
        key={checkoutFlow.id}
        flow={checkoutFlow}
        layout={layout}
        onLayoutChange={setLayout}
      />
    </main>
  );
}
