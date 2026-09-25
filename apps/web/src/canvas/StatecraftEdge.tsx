import {
  BaseEdge,
  getSmoothStepPath,
  useStore,
  type EdgeProps,
} from '@xyflow/react';
import { memo, useId } from 'react';
import type { CanvasEdge } from './to-react-flow-graph';

export const StatecraftEdge = memo(function StatecraftEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<CanvasEdge>) {
  const markerId = useId();
  const isRelated = useStore(
    (state) =>
      !!state.nodeLookup.get(source)?.selected ||
      !!state.nodeLookup.get(target)?.selected,
  );
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const label =
    data?.kind === 'success'
      ? 'Success'
      : data?.kind === 'failure'
        ? 'Failure'
        : '';

  return (
    <g className={`statecraft-edge${isRelated ? ' statecraft-edge--related' : ''}`}>
      <defs>
        <marker
          id={markerId}
          markerWidth="18"
          markerHeight="18"
          viewBox="-10 -10 20 20"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
          refX="0"
          refY="0"
        >
          <path className="statecraft-edge__arrow" d="M-5 -4 0 0 -5 4Z" />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#${markerId})`}
        label={label}
        labelX={labelX}
        labelY={labelY}
        labelBgPadding={[7, 4]}
        labelBgBorderRadius={4}
        interactionWidth={20}
      />
    </g>
  );
});
