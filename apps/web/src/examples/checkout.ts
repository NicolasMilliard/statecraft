import type { Flow } from '@statecraft/core';
import type { FlowLayout } from '../canvas/flow-layout';

export const checkoutFlow: Flow = {
  id: 'checkout',
  name: 'Checkout',
  entryNodeId: 'checkout-screen',
  nodes: [
    {
      id: 'checkout-screen',
      kind: 'screen',
      label: 'Checkout',
    },
    {
      id: 'payment-form',
      kind: 'ui',
      label: 'Payment form',
    },
    {
      id: 'submit-order',
      kind: 'action',
      label: 'Submit order',
    },
    {
      id: 'create-order',
      kind: 'service',
      label: 'POST /orders',
    },
    {
      id: 'order-confirmed',
      kind: 'state',
      label: 'Order confirmed',
    },
    {
      id: 'order-error',
      kind: 'state',
      label: 'Order error',
    },
  ],
  edges: [
    {
      id: 'checkout-to-form',
      sourceNodeId: 'checkout-screen',
      targetNodeId: 'payment-form',
      kind: 'transition',
    },
    {
      id: 'form-to-submit',
      sourceNodeId: 'payment-form',
      targetNodeId: 'submit-order',
      kind: 'transition',
    },
    {
      id: 'submit-to-service',
      sourceNodeId: 'submit-order',
      targetNodeId: 'create-order',
      kind: 'transition',
    },
    {
      id: 'order-success',
      sourceNodeId: 'create-order',
      targetNodeId: 'order-confirmed',
      kind: 'success',
    },
    {
      id: 'order-failure',
      sourceNodeId: 'create-order',
      targetNodeId: 'order-error',
      kind: 'failure',
    },
  ],
  codeReferences: [],
};

export const checkoutLayout: FlowLayout = {
  flowId: 'checkout',
  positions: {
    'checkout-screen': { x: 280, y: 0 },
    'payment-form': { x: 280, y: 110 },
    'submit-order': { x: 280, y: 220 },
    'create-order': { x: 280, y: 330 },
    'order-confirmed': { x: 80, y: 470 },
    'order-error': { x: 480, y: 470 },
  },
};
