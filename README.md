# AI Edit Manager

AI Edit Manager is a powerful VS Code extension that provides intelligent undo and rollback functionality with special support for AI-generated code changes from tools like GitHub Copilot and Cursor AI.

## Features

- 🤖 **AI-Aware Change Tracking**: Automatically detects and tracks changes made by AI tools like GitHub Copilot and Cursor
- 🔄 **Smart Undo**: Uses AI to analyze changes and help you decide whether to keep or undo them
- 📝 **Rich History**: Maintains a detailed history of both manual and AI-generated changes
- 🔍 **Visual Diff**: Compare changes with an integrated diff viewer
- 🔒 **Secure**: Stores API keys securely in VS Code's secret storage

## Commands

All commands can be accessed via the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- `AI Edit: Configure Settings` - Configure AI provider and API key
- `AI Edit: Undo Last AI Change` (Ctrl+Shift+Z) - Quickly undo the last AI-generated change
- `AI Edit: Analyze and Undo with AI` (Ctrl+Shift+U) - Analyze current changes with AI and decide whether to undo
- `AI Edit: Show Edit History` (Ctrl+Shift+H) - View and compare historical changes
- `AI Edit: Rollback to Point` - Roll back to any point in the file's history

## Setup

1. Install the extension from VS Code Marketplace
2. Open the Command Palette and run `AI Edit: Configure Settings`
3. Choose your preferred AI provider (OpenAI or Anthropic)
4. Enter your API key (stored securely)
5. Optionally configure other settings in VS Code settings

## Configuration

The extension supports the following settings:

- `aiEdit.provider`: AI provider to use ("openai" or "anthropic")
- `aiEdit.model`: AI model to use (defaults to GPT-4 Turbo for OpenAI)
- `aiEdit.maxHistorySize`: Maximum number of history entries per file
- `aiEdit.trackAIChanges`: Enable/disable tracking of AI-generated changes

## Usage

### Managing AI Changes

When GitHub Copilot or Cursor AI makes changes to your code:

1. Use `Ctrl+Shift+Z` to quickly undo the last AI change
2. Or use `Ctrl+Shift+U` to get an AI analysis of the changes before deciding
3. View the diff to see exactly what changed

### Viewing History

1. Press `Ctrl+Shift+H` to open the history view
2. Select any point in history to:
   - View the differences
   - Roll back to that point
   - Analyze changes with AI

### Rolling Back Changes

1. Use the Command Palette to run `AI Edit: Rollback to Point`
2. Select the desired point in history
3. The file will be restored to that state, including cursor position

## Requirements

- VS Code 1.99.0 or higher
- OpenAI API key or Anthropic API key

## Known Issues

Please report any issues on our GitHub repository.

## Release Notes

### 1.0.0

Initial release with:
- AI-aware change tracking
- Smart undo functionality
- History management
- Visual diff integration
- Secure API key storage
