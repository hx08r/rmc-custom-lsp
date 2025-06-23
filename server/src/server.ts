import {
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  Position,
  Range,
  Hover,
  TextDocumentContentChangeEvent
} from 'vscode-languageserver/node';

// Simple TextDocument implementation
class SimpleTextDocument {
  private _uri: string;
  private _languageId: string;
  private _version: number;
  private _content: string;

  constructor(uri: string, languageId: string, version: number, content: string) {
    this._uri = uri;
    this._languageId = languageId;
    this._version = version;
    this._content = content;
  }

  get uri(): string { return this._uri; }
  get languageId(): string { return this._languageId; }
  get version(): number { return this._version; }

  getText(): string {
    return this._content;
  }

  update(changes: TextDocumentContentChangeEvent[], version: number): void {
    this._version = version;
    for (const change of changes) {
      if ('range' in change && change.range) {
        // Incremental change
        const startOffset = this.offsetAt(change.range.start);
        const endOffset = this.offsetAt(change.range.end);
        this._content = this._content.substring(0, startOffset) + 
                       change.text + 
                       this._content.substring(endOffset);
      } else {
        // Full document change
        this._content = change.text;
      }
    }
  }

  positionAt(offset: number): Position {
    const lines = this._content.substring(0, offset).split('\n');
    return Position.create(lines.length - 1, lines[lines.length - 1].length);
  }

  offsetAt(position: Position): number {
    const lines = this._content.split('\n');
    let offset = 0;
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    return offset + Math.min(position.character, lines[position.line]?.length || 0);
  }
}

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Simple document manager
const documents = new Map<string, SimpleTextDocument>();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

// Import our custom classes
import { SchemaValidator } from './schema-validator';
import { CompletionProvider } from './completion-provider';
import { HoverProvider } from './hover-provider';

const schemaValidator = new SchemaValidator();
const completionProvider = new CompletionProvider();
const hoverProvider = new HoverProvider();

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['<', '/', ' ', '=', '"']
      },
      hoverProvider: true
    }
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

// Document handlers
connection.onDidOpenTextDocument((params) => {
  const document = new SimpleTextDocument(
    params.textDocument.uri,
    params.textDocument.languageId,
    params.textDocument.version,
    params.textDocument.text
  );
  documents.set(params.textDocument.uri, document);
  validateTextDocument(document);
});

connection.onDidChangeTextDocument((params) => {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    document.update(params.contentChanges, params.textDocument.version);
    validateTextDocument(document);
  }
});

connection.onDidCloseTextDocument((params) => {
  documents.delete(params.textDocument.uri);
});

async function validateTextDocument(textDocument: SimpleTextDocument): Promise<void> {
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    // Simple XML validation
    const validationErrors = schemaValidator.validateSimple(text);
    
    for (const error of validationErrors) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: error.range,
        message: error.message,
        source: 'rmc-xml-lsp'
      };
      diagnostics.push(diagnostic);
    }

  } catch (error) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: Range.create(Position.create(0, 0), Position.create(0, 10)),
      message: `XML Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'rmc-xml-lsp'
    };
    diagnostics.push(diagnostic);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Completion handler
connection.onCompletion(
  (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
      return [];
    }

    return completionProvider.provideCompletions(document, textDocumentPosition.position);
  }
);

connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    // Just return the item as-is for now
    // You can add more detailed documentation here later
    return item;
  }
);

// Hover handler
connection.onHover(
  (textDocumentPosition: TextDocumentPositionParams): Hover | null => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
      return null;
    }

    return hoverProvider.provideHover(document, textDocumentPosition.position);
  }
);

// Listen on the connection
connection.listen();