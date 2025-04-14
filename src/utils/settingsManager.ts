import * as vscode from 'vscode';

export interface AISettings {
    provider: 'openai' | 'anthropic';
    model: string;
    apiKey: string;
}

export class SettingsManager {
    private static readonly SECTION = 'aiEdit';
    private static readonly SECRET_STORAGE_KEY = 'ai-edit-api-key';

    constructor(private context: vscode.ExtensionContext) {}

    async getAISettings(): Promise<AISettings | undefined> {
        const config = vscode.workspace.getConfiguration(SettingsManager.SECTION);
        const provider = config.get<'openai' | 'anthropic'>('provider') || 'openai';
        const model = config.get<string>('model') || this.getDefaultModel(provider);
        const apiKey = await this.context.secrets.get(SettingsManager.SECRET_STORAGE_KEY);

        if (!apiKey) {
            return undefined;
        }

        return { provider, model, apiKey };
    }

    async setAPIKey(apiKey: string): Promise<void> {
        await this.context.secrets.store(SettingsManager.SECRET_STORAGE_KEY, apiKey);
    }

    private getDefaultModel(provider: 'openai' | 'anthropic'): string {
        return provider === 'openai' ? 'gpt-4-turbo-preview' : 'claude-3-opus-20240229';
    }

    async showSettingsQuickPick(): Promise<void> {
        const items = [
            { label: 'Configure API Key', description: 'Set your OpenAI or Anthropic API key' },
            { label: 'Select AI Provider', description: 'Choose between OpenAI and Anthropic' },
            { label: 'Select Model', description: 'Choose the AI model to use' }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a setting to configure'
        });

        if (!selected) {
            return;
        }

        switch (selected.label) {
            case 'Configure API Key':
                await this.configureAPIKey();
                break;
            case 'Select AI Provider':
                await this.selectProvider();
                break;
            case 'Select Model':
                await this.selectModel();
                break;
        }
    }

    private async configureAPIKey(): Promise<void> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your API key',
            password: true,
            placeHolder: 'API key for OpenAI or Anthropic'
        });

        if (apiKey) {
            await this.setAPIKey(apiKey);
            vscode.window.showInformationMessage('API key saved successfully');
        }
    }

    private async selectProvider(): Promise<void> {
        const provider = await vscode.window.showQuickPick(
            [
                { label: 'OpenAI', description: 'Use OpenAI models (GPT-4, etc.)' },
                { label: 'Anthropic', description: 'Use Anthropic models (Claude)' }
            ],
            { placeHolder: 'Select AI provider' }
        );

        if (provider) {
            await vscode.workspace.getConfiguration(SettingsManager.SECTION).update(
                'provider',
                provider.label.toLowerCase(),
                vscode.ConfigurationTarget.Global
            );
        }
    }

    private async selectModel(): Promise<void> {
        const config = vscode.workspace.getConfiguration(SettingsManager.SECTION);
        const provider = config.get<string>('provider') || 'openai';
        
        const models = provider === 'openai' 
            ? [
                { label: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
                { label: 'GPT-4', value: 'gpt-4' },
                { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
            ]
            : [
                { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
                { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
                { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
            ];

        const selected = await vscode.window.showQuickPick(models, {
            placeHolder: 'Select AI model'
        });

        if (selected) {
            await vscode.workspace.getConfiguration(SettingsManager.SECTION).update(
                'model',
                selected.value,
                vscode.ConfigurationTarget.Global
            );
        }
    }
}