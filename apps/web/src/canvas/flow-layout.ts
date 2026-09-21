export interface FlowNodePosition {
  readonly x: number;
  readonly y: number;
}

export interface FlowLayout {
  readonly flowId: string;
  readonly positions: Readonly<Record<string, FlowNodePosition>>;
}
