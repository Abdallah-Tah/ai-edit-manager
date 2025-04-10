import * as vscode from 'vscode';
import { callLLM } from './llm';
import { showDiffView } from './utils/diff';
import { pushSnapshot, popSnapshot, hasSnapshots } from './history/historyManager';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ AI Edit Manager activated');
  context.subscriptions.push(
    vscode.commands.registerCommand('aiEdit.fixWithAI', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found. Please open a file to edit.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      if (!selectedText) {
        vscode.window.showInformationMessage('Please select code to fix.');
        return;
      }

      const config = vscode.workspace.getConfiguration('aiEdit');
      const provider = config.get<string>('provider')!;
      const model = config.get<string>('model')!;
      const apiKey = await context.secrets.get('aiEdit.apiKey');
      if (!apiKey) {
        vscode.window.showErrorMessage('Missing API key. Run "AI Edit: Configure" first.');
        return;
      }

      const fullTextBefore = editor.document.getText();
      pushSnapshot(fullTextBefore);

      const prompt = `You are a senior developer. Fix and improve this code only within the selected context:\n\n${selectedText}`;

      try {
        const aiOutput = await callLLM(provider, apiKey, model, prompt);

        await showDiffView(selectedText, aiOutput);

        const confirm = await vscode.window.showQuickPick(['Apply edit', 'Cancel'], {
          placeHolder: 'Do you want to apply this AI edit?'
        });

        if (confirm === 'Apply edit') {
          editor.edit(edit => {
            edit.replace(selection, aiOutput);
          });
          vscode.window.showInformationMessage('AI edit applied.');
        } else {
          vscode.window.showInformationMessage('AI edit discarded.');
          popSnapshot();
        }

      } catch (e: any) {
        vscode.window.showErrorMessage('AI error: ' + e.message);
      }
    }),

    vscode.commands.registerCommand('aiEdit.undoLastAIEdit', async () => {
      if (!hasSnapshots()) {
        vscode.window.showInformationMessage('No AI edits to undo.');
        return;
      }

      const editor = vscode.window.activeTextEditor;
      const lastSnapshot = popSnapshot();
      if (!editor || !lastSnapshot) {
        vscode.window.showInformationMessage('No active editor or no snapshots found.');
        return;
      }

      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );

      editor.edit(edit => edit.replace(fullRange, lastSnapshot));
      vscode.window.showInformationMessage('Reverted last AI edit.');
    }),

    vscode.commands.registerCommand('aiEdit.configure', async () => {
      const provider = await vscode.window.showQuickPick(['openai', 'anthropic'], {
        placeHolder: 'Choose LLM Provider'
      });
      if (!provider){
        vscode.window.showInformationMessage('Configuration cancelled.');
        return;
      }

      const model = await vscode.window.showInputBox({
        prompt: 'Model to use (e.g., gpt-4o or claude-3-sonnet-20240229)',
        value: provider === 'openai' ? 'gpt-4o' : 'claude-3-sonnet-20240229'
      });
      if (!model) {
        vscode.window.showInformationMessage('Model input cancelled.');
        return;
      }

      const apiKey = await vscode.window.showInputBox({
        prompt: `Enter your API key for ${provider}`,
        password: true,
        ignoreFocusOut: true
      });
      if (!apiKey) {
        vscode.window.showInformationMessage('API key input cancelled.');
        return;
      }
      await vscode.workspace.getConfiguration().update('aiEdit.provider', provider, true);
      await vscode.workspace.getConfiguration().update('aiEdit.model', model, true);
      await context.secrets.store('aiEdit.apiKey', apiKey);

      vscode.window.showInformationMessage(`AI Edit configured for ${provider} (${model})`);
    }),

    vscode.commands.registerCommand('aiEdit.removeToken', async () => {
      await context.secrets.delete('aiEdit.apiKey');
      vscode.window.showInformationMessage('AI Edit API key has been removed.');
    })
  );
}

export function deactivate() {}
