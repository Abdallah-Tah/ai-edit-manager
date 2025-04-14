import * as vscode from 'vscode';
import { historyManager } from './history/historyManager';
import { AIChangeTracker } from './history/aiChangeTracker';
import { SettingsManager } from './utils/settingsManager';
import { showDiffView } from './utils/diff';
import { callLLM } from './llm';

let settingsManager: SettingsManager;
let aiChangeTracker: AIChangeTracker;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Edit Manager is activating...');
  
  // Initialize managers
  settingsManager = new SettingsManager(context);
  aiChangeTracker = new AIChangeTracker();

  // File system watcher for tracking changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  
  // Track file changes
  watcher.onDidChange(async (uri) => {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = vscode.window.activeTextEditor;
    
    historyManager.pushSnapshot(
      uri.fsPath,
      document.getText(),
      'file_change',
      editor?.selection.active,
      editor?.selection
    );
  });

  // Register commands
  context.subscriptions.push(
    // AI Settings command
    vscode.commands.registerCommand('aiEdit.settings', async () => {
      await settingsManager.showSettingsQuickPick();
    }),

    // Undo last AI change command
    vscode.commands.registerCommand('aiEdit.undoLastAIChange', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const lastChange = aiChangeTracker.getLastAIChange(filePath);

      if (!lastChange) {
        vscode.window.showInformationMessage('No recent AI changes found');
        return;
      }

      const action = await vscode.window.showInformationMessage(
        `Undo last change by ${lastChange.source}?`,
        'Yes',
        'No',
        'Show Diff'
      );

      if (action === 'Yes') {
        await editor.edit(builder => {
          const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
          );
          builder.replace(fullRange, lastChange.originalContent);
        });
      } else if (action === 'Show Diff') {
        await showDiffView(lastChange.originalContent, lastChange.content, `${lastChange.source} Change`);
      }
    }),

    // Existing undoWithAI command
    vscode.commands.registerCommand('aiEdit.undoWithAI', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const settings = await settingsManager.getAISettings();
      if (!settings) {
        const action = await vscode.window.showWarningMessage(
          'AI settings not configured. Would you like to configure them now?',
          'Configure',
          'Cancel'
        );
        if (action === 'Configure') {
          await settingsManager.showSettingsQuickPick();
        }
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const currentContent = editor.document.getText();
      
      // Check for AI changes first
      const lastAIChange = aiChangeTracker.getLastAIChange(filePath);
      const snapshots = historyManager.getSnapshots(filePath);
      
      if (!lastAIChange && (!snapshots || snapshots.length < 2)) {
        vscode.window.showInformationMessage('No changes to analyze');
        return;
      }

      const compareContent = lastAIChange ? lastAIChange.originalContent : snapshots[snapshots.length - 2].content;

      try {
        const prompt = `Analyze these code changes ${lastAIChange ? `made by ${lastAIChange.source}` : ''} and suggest if they should be undone:
Previous version:
\`\`\`
${compareContent}
\`\`\`

Current version:
\`\`\`
${currentContent}
\`\`\`

Please analyze the changes and explain:
1. What changed
2. Whether these changes improve or potentially harm the code
3. Your recommendation (keep or undo)`;

        const suggestion = await callLLM(settings.provider, settings.apiKey, settings.model, prompt);
        
        const action = await vscode.window.showInformationMessage(
          suggestion,
          'Undo Changes',
          'Keep Changes',
          'Show Diff'
        );

        if (action === 'Undo Changes') {
          await editor.edit(builder => {
            const fullRange = new vscode.Range(
              editor.document.positionAt(0),
              editor.document.positionAt(editor.document.getText().length)
            );
            builder.replace(fullRange, compareContent);
          });
        } else if (action === 'Show Diff') {
          await showDiffView(compareContent, currentContent, 'AI Analysis');
        }
      } catch (error: any) {
        vscode.window.showErrorMessage('Error analyzing changes: ' + (error.message || 'Unknown error'));
      }
    }),

    // Existing showHistory command
    vscode.commands.registerCommand('aiEdit.showHistory', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const snapshots = historyManager.getSnapshots(filePath);
      const aiChanges = aiChangeTracker.getAIChanges(filePath);

      if (snapshots.length === 0 && aiChanges.length === 0) {
        vscode.window.showInformationMessage('No history available for this file');
        return;
      }

      // Combine regular snapshots and AI changes
      const items = [
        ...snapshots.map(snapshot => ({
          label: new Date(snapshot.timestamp).toLocaleString(),
          description: snapshot.reason || 'Manual edit',
          timestamp: snapshot.timestamp,
          type: 'snapshot' as const,
          content: snapshot.content
        })),
        ...aiChanges.map(change => ({
          label: new Date(change.timestamp).toLocaleString(),
          description: `${change.source} change`,
          timestamp: change.timestamp,
          type: 'ai' as const,
          content: change.originalContent
        }))
      ].sort((a, b) => b.timestamp - a.timestamp);

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a point in history to view'
      });

      if (selected) {
        await showDiffView(selected.content, editor.document.getText(), 'History Comparison');
      }
    }),

    // Existing rollbackToPoint command with AI awareness
    vscode.commands.registerCommand('aiEdit.rollbackToPoint', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const snapshots = historyManager.getSnapshots(filePath);
      const aiChanges = aiChangeTracker.getAIChanges(filePath);

      if (snapshots.length === 0 && aiChanges.length === 0) {
        vscode.window.showInformationMessage('No history available for this file');
        return;
      }

      const items = [
        ...snapshots.map(snapshot => ({
          label: new Date(snapshot.timestamp).toLocaleString(),
          description: snapshot.reason || 'Manual edit',
          timestamp: snapshot.timestamp,
          type: 'snapshot' as const,
          content: snapshot.content
        })),
        ...aiChanges.map(change => ({
          label: new Date(change.timestamp).toLocaleString(),
          description: `${change.source} change`,
          timestamp: change.timestamp,
          type: 'ai' as const,
          content: change.originalContent
        }))
      ].sort((a, b) => b.timestamp - a.timestamp);

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a point to rollback to'
      });

      if (!selected) {
        return;
      }

      if (selected.type === 'snapshot') {
        const snapshot = historyManager.rollbackTo(filePath, selected.timestamp);
        if (snapshot) {
          await editor.edit(builder => {
            const fullRange = new vscode.Range(
              editor.document.positionAt(0),
              editor.document.positionAt(editor.document.getText().length)
            );
            builder.replace(fullRange, snapshot.content);
          });
        }
      } else {
        await editor.edit(builder => {
          const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
          );
          builder.replace(fullRange, selected.content);
        });
      }
    })
  );

  // Add watchers to subscriptions
  context.subscriptions.push(watcher);
  
  vscode.window.showInformationMessage('✅ AI Edit Manager is running 🚀');
  console.log('✅ AI Edit Manager activated');
}

export function deactivate() {
  historyManager.clear();
  aiChangeTracker.clearAIChanges();
}
