const snapshotStack: string[] = [];

export function pushSnapshot(content: string) {
  snapshotStack.push(content);
}

export function popSnapshot(): string | null {
  return snapshotStack.pop() || null;
}

export function hasSnapshots() {
  return snapshotStack.length > 0;
}
