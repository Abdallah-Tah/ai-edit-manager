import * as vscode from 'vscode';
import { historyManager } from './historyManager';

interface AIChange {
    source: 'copilot' | 'cursor' | 'other';
    timestamp: number;
    content: string;
    originalContent: string;
    reason?: string;
}

export class AIChangeTracker {
    private static readonly copilotChangeTriggers = [
        'GitHub.copilot', 
        'GitHub.copilot-chat'
    ];

    private static readonly cursorChangeTriggers = [
        'cursorAI.action.inlineComplete',
        'cursorAI.action.chat'
    ];

    private aiChanges: Map<string, AIChange[]> = new Map();
    private lastActiveEditor: string | undefined;

    constructor() {
        // Track active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.lastActiveEditor = editor.document.uri.fsPath;
            }
        });

        // Track when extensions make changes
        vscode.workspace.onDidChangeTextDocument(event => {
            this.handleDocumentChange(event);
        });
    }

    private async handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
        if (event.contentChanges.length === 0) {
            return;
        }

        const filePath = event.document.uri.fsPath;
        const change = event.contentChanges[0];
        
        // Get the extension that made the change
        const changeSource = await this.detectAIChangeSource();
        if (!changeSource) {
            return;
        }

        // Store original content before the change
        const originalContent = event.document.getText();
        
        // Take a snapshot of the change
        historyManager.pushSnapshot(
            filePath,
            originalContent,
            `AI Change (${changeSource})`,
            undefined,
            undefined
        );

        // Track the AI-specific change
        if (!this.aiChanges.has(filePath)) {
            this.aiChanges.set(filePath, []);
        }

        const changes = this.aiChanges.get(filePath)!;
        changes.push({
            source: changeSource,
            timestamp: Date.now(),
            content: event.document.getText(),
            originalContent,
            reason: `AI Suggestion by ${changeSource}`
        });

        // Keep only recent history
        if (changes.length > 50) {
            changes.shift();
        }
    }

    private async detectAIChangeSource(): Promise<'copilot' | 'cursor' | 'other' | undefined> {
        const extensions = vscode.extensions.all;
        
        // Check if change came from Copilot
        const isCopilotChange = extensions.some(ext => 
            AIChangeTracker.copilotChangeTriggers.includes(ext.id) && ext.isActive
        );
        if (isCopilotChange) {
            return 'copilot';
        }

        // Check if change came from Cursor
        const isCursorChange = extensions.some(ext =>
            AIChangeTracker.cursorChangeTriggers.includes(ext.id) && ext.isActive
        );
        if (isCursorChange) {
            return 'cursor';
        }

        return undefined;
    }

    public getAIChanges(filePath: string): AIChange[] {
        return this.aiChanges.get(filePath) || [];
    }

    public getLastAIChange(filePath: string): AIChange | undefined {
        const changes = this.aiChanges.get(filePath);
        if (!changes || changes.length === 0) {
            return undefined;
        }
        return changes[changes.length - 1];
    }

    public clearAIChanges(filePath?: string) {
        if (filePath) {
            this.aiChanges.delete(filePath);
        } else {
            this.aiChanges.clear();
        }
    }
}