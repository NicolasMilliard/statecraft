export type CanvasSelection =
  | { readonly type: 'node'; readonly id: string }
  | { readonly type: 'edge'; readonly id: string }
  | null;
