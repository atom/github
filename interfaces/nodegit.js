declare class ConvenientHunk {

}

declare class DiffFile {
  mode(): number;
  path(): string;
}

declare class ConvenientPatch {
  hunks(): Promise<Array<ConvenientHunk>>;
  size(): number;
  isRenamed(): boolean;
  isUntracked(): boolean;
  isAdded(): boolean;
  isRenamed(): boolean;
  isDeleted(): boolean;
  newFile(): ?DiffFile;
  oldFile(): ?DiffFile;
}
