export type CodeReferenceRole = 'primary' | 'dependency';

export interface CodeReference {
  readonly id: string;
  readonly flowNodeId: string;
  readonly repositoryId: string;
  readonly codeEntityId: string;
  readonly role: CodeReferenceRole;
}
