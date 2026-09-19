export const CODE_ENTITY_KINDS = [
  'route',
  'component',
  'function',
  'hook',
  'query',
  'mutation',
  'endpoint',
  'store',
  'state',
] as const;

export type CodeEntityKind = (typeof CODE_ENTITY_KINDS)[number];

export const CODE_RELATION_KINDS = [
  'imports',
  'renders',
  'calls',
  'uses',
  'reads',
  'writes',
  'navigates_to',
] as const;

export type CodeRelationKind = (typeof CODE_RELATION_KINDS)[number];

export interface CodeEntity {
  readonly id: string;
  readonly kind: CodeEntityKind;
  readonly name: string;
  readonly filePath: string;
  readonly symbol: string | null;
}

export interface CodeRelation {
  readonly id: string;
  readonly kind: CodeRelationKind;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
}

export interface CodeGraph {
  readonly repositoryId: string;
  readonly entities: readonly CodeEntity[];
  readonly relations: readonly CodeRelation[];
}
