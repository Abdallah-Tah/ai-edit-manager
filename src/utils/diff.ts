import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function showDiffView(original: string, modified: string, title = 'AI Edit Preview') {
  const tempDir = os.tmpdir();
  const beforePath = path.join(tempDir, 'ai-edit-before.txt');
  const afterPath = path.join(tempDir, 'ai-edit-after.txt');

  fs.writeFileSync(beforePath, original);
  fs.writeFileSync(afterPath, modified);

  const leftUri = vscode.Uri.file(beforePath).with({ scheme: 'untitled' });
  const rightUri = vscode.Uri.file(afterPath).with({ scheme: 'untitled' });

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}
