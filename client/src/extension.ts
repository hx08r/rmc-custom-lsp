import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

import * as path from 'path';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('RMC XML LSP Extension is activating...');
  
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'rmc-xml' }
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.rmc.xml')
    }
  };

  client = new LanguageClient(
    'rmcXmlLanguageServer',
    'RMC XML Language Server',
    serverOptions,
    clientOptions
  );

  // Register command to manually set language
  const setLanguageCommand = vscode.commands.registerCommand('rmc-xml.setLanguage', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      vscode.languages.setTextDocumentLanguage(activeEditor.document, 'rmc-xml');
    }
  });

  // Auto-detect RMC XML files
  const autoDetect = vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.languageId === 'xml' && document.getText().includes('<EtaRsccat')) {
      vscode.languages.setTextDocumentLanguage(document, 'rmc-xml');
    }
  });

  context.subscriptions.push(setLanguageCommand, autoDetect);

  client.start();
  console.log('RMC XML LSP Client started');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}