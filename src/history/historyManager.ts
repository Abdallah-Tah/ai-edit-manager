import * as vscode from 'vscode';

interface EditSnapshot {
  content: string;
  timestamp: number;
  filePath: string;
  reason?: string;
  cursorPosition?: vscode.Position;
  selection?: vscode.Selection;
}

class HistoryManager {
  private snapshots: Map<string, EditSnapshot[]> = new Map();
  private maxHistoryPerFile = 50;

  constructor() {
    this.snapshots = new Map();
  }

  public pushSnapshot(
    filePath: string, 
    content: string,
    reason?: string,
    cursorPosition?: vscode.Position,
    selection?: vscode.Selection
  ) {
    if (!this.snapshots.has(filePath)) {
      this.snapshots.set(filePath, []);
    }

    const fileSnapshots = this.snapshots.get(filePath)!;
    
    // Add new snapshot
    fileSnapshots.push({
      content,
      timestamp: Date.now(),
      filePath,
      reason,
      cursorPosition,
      selection
    });

    // Trim history if needed
    if (fileSnapshots.length > this.maxHistoryPerFile) {
      fileSnapshots.shift();
    }
  }

  public getSnapshots(filePath: string): EditSnapshot[] {
    return this.snapshots.get(filePath) || [];
  }

  public getLatestSnapshot(filePath: string): EditSnapshot | undefined {
    const fileSnapshots = this.snapshots.get(filePath);
    if (!fileSnapshots || fileSnapshots.length === 0) {
      return undefined;
    }
    return fileSnapshots[fileSnapshots.length - 1];
  }

  public rollbackTo(filePath: string, timestamp: number): EditSnapshot | undefined {
    const fileSnapshots = this.snapshots.get(filePath);
    if (!fileSnapshots) {
      return undefined;
    }

    const index = fileSnapshots.findIndex(s => s.timestamp === timestamp);
    if (index === -1) {
      return undefined;
    }

    // Remove all snapshots after the target point
    const snapshot = fileSnapshots[index];
    this.snapshots.set(filePath, fileSnapshots.slice(0, index + 1));
    
    return snapshot;
  }

  public clear(filePath?: string) {
    if (filePath) {
      this.snapshots.delete(filePath);
    } else {
      this.snapshots.clear();
    }
  }
}

export const historyManager = new HistoryManager();
