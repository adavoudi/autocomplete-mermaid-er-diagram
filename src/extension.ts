import * as vscode from 'vscode';
import * as fs from 'fs';

class MmdCompletionItemProvider implements vscode.CompletionItemProvider {
	private items: vscode.CompletionItem[] = [];

	public constructor() {
		this.refreshCache();
	}

	public provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): Thenable<vscode.CompletionItem[]> {
		return Promise.resolve(this.items);
	}

	public refreshCache() {
		const newItems: vscode.CompletionItem[] = [];
		const files = vscode.workspace.findFiles('**/*.mmd', '**/node_modules/**', 100);

		files.then(mmdFiles => {
			for (let file of mmdFiles) {

				try {
					const content = fs.readFileSync(file.fsPath).toString();
					const blocks = content.split('%% export');
					const path = file.path.split("/")
					const file_name = path[path.length - 1]

					for (let block of blocks.slice(1)) {
						const lines: any[] = ["\t%% imported from `" + file_name + "`"]
						for (let line of block.split('\n')) {
							if (line.trim().length == 0) {
								continue
							}
							lines.push(line)
							if (line.trim() == '}') {
								break
							}
						}

						const label = lines[1].trim() + " - " + file_name;
						const detail = lines.join('\n').trim();

						let item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
						item.insertText = new vscode.SnippetString(detail);
						newItems.push(item);
					}
				} catch (error) {
					console.error(`Failed to read file ${file.fsPath}: ${error}`);
				}
			}

			this.items = newItems;
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	let provider = new MmdCompletionItemProvider();

	// Create a file system watcher
	const watcher = vscode.workspace.createFileSystemWatcher("**/*.mmd");
	watcher.onDidChange(() => {
		// Refresh the cache when a .mmd file changes
		provider.refreshCache();
	});

	// Register the completion item provider for 'plaintext' language
	const providerRegistration = vscode.languages.registerCompletionItemProvider(
		'mermaid',
		provider
	);

	// Add the provider and the watcher to the subscriptions
	// They will be automatically disposed when the extension is deactivated
	context.subscriptions.push(providerRegistration, watcher);
}
