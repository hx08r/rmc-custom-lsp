# RMC XML LSP - Developer Documentation

This document provides detailed technical information about the implementation of the RMC XML Language Server Protocol extension.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Client Implementation](#client-implementation)
- [Server Implementation](#server-implementation)
- [Completion Provider](#completion-provider)
- [Schema Validator](#schema-validator)
- [Hover Provider](#hover-provider)
- [Syntax Highlighting](#syntax-highlighting)
- [Communication Flow](#communication-flow)
- [Adding New Features](#adding-new-features)

## Architecture Overview

The extension follows the standard LSP architecture with a clear separation between client and server:

```
┌─────────────────┐    JSON-RPC    ┌─────────────────┐
│   VS Code       │◄──────────────►│  Language       │
│   Extension     │                │  Server         │
│   (Client)      │                │                 │
└─────────────────┘                └─────────────────┘
        │                                   │
        ├── Extension Activation            ├── Text Analysis
        ├── Document Management             ├── Completion Logic
        ├── Language Registration           ├── Validation
        └── Command Registration            └── Hover Information
```

### Key Components

1. **Client (`client/src/extension.ts`)**: VS Code extension that manages the language server lifecycle
2. **Server (`server/src/server.ts`)**: Core LSP server handling requests
3. **Completion Provider**: Context-aware auto-completion logic
4. **Schema Validator**: XML validation against RMC schema
5. **Hover Provider**: Documentation and type information
6. **Syntax Highlighter**: Custom TextMate grammar for RMC XML

## Client Implementation

### Extension Activation (`client/src/extension.ts`)

```typescript
export function activate(context: vscode.ExtensionContext) {
  // 1. Resolve server module path
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  // 2. Configure server options
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  // 3. Configure client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'rmc-xml' }]
  };

  // 4. Create and start language client
  client = new LanguageClient(
    'rmcXmlLanguageServer',
    'RMC XML Language Server',
    serverOptions,
    clientOptions
  );
}
```

#### Key Responsibilities:
- **Server Lifecycle Management**: Starts/stops the language server process
- **Document Selector**: Defines which files the server should handle
- **Auto-Detection**: Automatically switches XML files containing `<EtaRsccat` to RMC mode
- **Command Registration**: Registers VS Code commands for manual language switching

### Language Detection Logic

```typescript
const autoDetect = vscode.workspace.onDidOpenTextDocument((document) => {
  if (document.languageId === 'xml' && document.getText().includes('<EtaRsccat')) {
    vscode.languages.setTextDocumentLanguage(document, 'rmc-xml');
  }
});
```

This automatically detects RMC XML files by looking for the root element `<EtaRsccat`.

## Server Implementation

### Main Server (`server/src/server.ts`)

The server implements the Language Server Protocol using the `vscode-languageserver` library:

```typescript
// Initialize connection
const connection = createConnection(ProposedFeatures.all);

// Handle initialization
connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['<', '/', ' ', '=', '"']
      },
      hoverProvider: true
    }
  };
});
```

#### Server Capabilities:
- **Text Document Sync**: Incremental updates for better performance
- **Completion Provider**: Triggered by `<`, `/`, space, `=`, and `"`
- **Hover Provider**: Shows documentation on element hover
- **No Resolve Provider**: Completions are fully resolved immediately

### Request Handlers

```typescript
// Completion requests
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) return [];
  
  return completionProvider.provideCompletions(document, textDocumentPosition.position);
});

// Hover requests
connection.onHover((textDocumentPosition: TextDocumentPositionParams) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) return null;
  
  return hoverProvider.provideHover(document, textDocumentPosition.position);
});

// Validation on document changes
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});
```

## Completion Provider

### Context Detection (`server/src/completion-provider.ts`)

The completion provider uses sophisticated context detection to determine what type of completion to provide:

```typescript
provideCompletions(document: SimpleTextDocument, position: Position): CompletionItem[] {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const beforeCursor = text.substring(0, offset);

  // Priority order matters!
  if (this.isInAttributeValue(beforeCursor)) {
    return this.getAttributeValueCompletions(beforeCursor);
  } else if (this.isInClosingTag(beforeCursor)) {
    return this.getClosingTagCompletions(text, position);
  } else if (this.isInAttributeName(beforeCursor)) {
    return this.getAttributeCompletions(beforeCursor);
  } else if (this.isInElementTag(beforeCursor)) {
    return this.getContextAwareElementCompletions(beforeCursor);
  }

  return [];
}
```

### Schema Hierarchy Implementation

The schema structure is encoded as a Map for efficient lookups:

```typescript
private schemaHierarchy = new Map([
  ['ROOT', ['EtaRsccat']],                    // Only EtaRsccat at root
  ['EtaRsccat', ['ZetaMessage']],             // EtaRsccat contains ZetaMessage
  ['ZetaMessage', ['BetaEntry']],             // ZetaMessage contains BetaEntry
  ['BetaEntry', ['OmegaA', 'SigmaDiag', 'LambdaActions', 'RandomElement1']],
  // ... more mappings
]);
```

### Context-Aware Element Completion

```typescript
private getContextAwareElementCompletions(beforeCursor: string): CompletionItem[] {
  // 1. Parse the XML to find current parent element
  const parentElement = this.findParentElement(beforeCursor);
  
  // 2. Look up allowed children in schema
  const allowedChildren = this.schemaHierarchy.get(parentElement) || [];
  
  // 3. Generate completion items with snippets
  return allowedChildren.map(element => ({
    label: element,
    kind: CompletionItemKind.Class,
    detail: `${element} element`,
    insertText: this.getElementInsertText(element),
    insertTextFormat: 2 // Snippet format
  }));
}
```

### Parent Element Detection

```typescript
private findParentElement(beforeCursor: string): string {
  const tagStack: string[] = [];
  
  // Parse all tags to build element stack
  const tagMatches = beforeCursor.match(/<\/?(\w+)[^>]*>/g);
  if (tagMatches) {
    for (const tag of tagMatches) {
      if (tag.startsWith('</')) {
        // Closing tag - pop from stack
        const tagName = tag.match(/<\/(\w+)/)?.[1];
        if (tagName) {
          const lastIndex = tagStack.lastIndexOf(tagName);
          if (lastIndex !== -1) {
            tagStack.splice(lastIndex, 1);
          }
        }
      } else if (!tag.endsWith('/>')) {
        // Opening tag - push to stack
        const tagName = tag.match(/<(\w+)/)?.[1];
        if (tagName) {
          tagStack.push(tagName);
        }
      }
    }
  }
  
  return tagStack.length > 0 ? tagStack[tagStack.length - 1] : 'ROOT';
}
```

### Attribute Completion Logic

```typescript
private getAttributeCompletions(beforeCursor: string): CompletionItem[] {
  // 1. Extract current element name
  const currentTagMatch = beforeCursor.match(/<(\w+)([^>]*)$/);
  if (!currentTagMatch) return [];
  
  const elementName = currentTagMatch[1];
  const attributesPart = currentTagMatch[2];
  
  // 2. Get available attributes for this element
  const attributes = this.elementAttributes.get(elementName) || [];
  const requiredAttrs = this.requiredAttributes.get(elementName) || [];
  
  // 3. Filter out already present attributes
  const existingAttrs = this.getExistingAttributes(attributesPart);
  
  // 4. Generate completion items
  return attributes
    .filter(attr => !existingAttrs.includes(attr))
    .map(attr => ({
      label: attr,
      kind: CompletionItemKind.Property,
      detail: `${attr} attribute${requiredAttrs.includes(attr) ? ' (required)' : ''}`,
      insertText: `${attr}="$1"`,
      insertTextFormat: 2
    }));
}
```

### Context Detection Methods

#### Element Tag Detection
```typescript
private isInElementTag(beforeCursor: string): boolean {
  const lastOpenBracket = beforeCursor.lastIndexOf('<');
  const lastCloseBracket = beforeCursor.lastIndexOf('>');
  
  if (lastOpenBracket <= lastCloseBracket) return false;
  
  const tagContent = beforeCursor.substring(lastOpenBracket);
  // We're in element tag if we haven't hit a space yet
  return !tagContent.includes(' ') && !tagContent.startsWith('</');
}
```

#### Attribute Name Detection
```typescript
private isInAttributeName(beforeCursor: string): boolean {
  const lastOpenBracket = beforeCursor.lastIndexOf('<');
  const lastCloseBracket = beforeCursor.lastIndexOf('>');
  
  if (lastOpenBracket <= lastCloseBracket) return false;
  
  const tagContent = beforeCursor.substring(lastOpenBracket);
  
  // We're in attribute name if:
  // 1. We have a space (attributes section started)
  // 2. We're not in an attribute value
  // 3. We're not right after an equals sign
  const hasSpace = tagContent.includes(' ');
  const inAttributeValue = this.isInAttributeValue(beforeCursor);
  const afterEquals = tagContent.endsWith('=');
  
  return hasSpace && !inAttributeValue && !afterEquals;
}
```

#### Attribute Value Detection
```typescript
private isInAttributeValue(beforeCursor: string): boolean {
  const lastOpenBracket = beforeCursor.lastIndexOf('<');
  const lastCloseBracket = beforeCursor.lastIndexOf('>');
  if (lastOpenBracket <= lastCloseBracket) return false;
  
  const tagContent = beforeCursor.substring(lastOpenBracket);
  
  // Count quotes to determine if we're inside a quoted value
  const doubleQuoteCount = (tagContent.match(/"/g) || []).length;
  const singleQuoteCount = (tagContent.match(/'/g) || []).length;
  
  // Odd number of quotes means we're inside quotes
  return (doubleQuoteCount % 2 === 1) || (singleQuoteCount % 2 === 1);
}
```

## Schema Validator

### Validation Strategy (`server/src/schema-validator.ts`)

The validator performs multiple types of validation:

```typescript
export class SchemaValidator {
  validate(document: SimpleTextDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const text = document.getText();
    
    // 1. Parse XML structure
    const elements = this.parseElements(text);
    
    // 2. Validate each element
    for (const element of elements) {
      // Check if element is known
      if (!this.isValidElement(element.name)) {
        diagnostics.push(this.createUnknownElementDiagnostic(element));
      }
      
      // Check required attributes
      const missingAttrs = this.getMissingRequiredAttributes(element);
      for (const attr of missingAttrs) {
        diagnostics.push(this.createMissingAttributeDiagnostic(element, attr));
      }
      
      // Validate attribute values
      for (const [attrName, attrValue] of Object.entries(element.attributes)) {
        if (!this.isValidAttributeValue(attrName, attrValue)) {
          diagnostics.push(this.createInvalidAttributeValueDiagnostic(element, attrName, attrValue));
        }
      }
    }
    
    return diagnostics;
  }
}
```

### Element Parsing

```typescript
private parseElements(text: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  const elementRegex = /<(\w+)([^>]*?)(?:\s*\/>|>)/g;
  let match;
  
  while ((match = elementRegex.exec(text)) !== null) {
    const elementName = match[1];
    const attributesString = match[2];
    const startOffset = match.index;
    const endOffset = match.index + match[0].length;
    
    // Parse attributes
    const attributes = this.parseAttributes(attributesString);
    
    elements.push({
      name: elementName,
      attributes,
      startOffset,
      endOffset,
      range: this.createRange(text, startOffset, endOffset)
    });
  }
  
  return elements;
}
```

### Attribute Validation

```typescript
private isValidAttributeValue(attributeName: string, value: string): boolean {
  // Check enum values
  const enumValues = this.attributeEnums.get(attributeName);
  if (enumValues) {
    return enumValues.includes(value);
  }
  
  // Check pattern-based attributes
  switch (attributeName) {
    case 'PsiKey':
    case 'UpsilonProduct':
      // Must match identifier pattern
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
    
    case 'PhiTranslate':
    case 'MuCdata':
    case 'KappaEnabled':
      // Boolean values
      return ['true', 'false'].includes(value.toLowerCase());
    
    default:
      return true; // No specific validation
  }
}
```

## Hover Provider

### Implementation (`server/src/hover-provider.ts`)

````typescript
export class HoverProvider {
  provideHover(document: SimpleTextDocument, position: Position): Hover | null {
    const text = document.getText();
    const offset = document.offsetAt(position);
    
    // 1. Find element at cursor position
    const element = this.findElementAtPosition(text, offset);
    if (!element) return null;
    
    // 2. Generate hover content
    const hoverContent = this.generateHoverContent(element);
    
    // 3. Create hover response
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: hoverContent
      },
      range: element.range
    };
  }

  private generateHoverContent(elementName: string): string {
    const attributes = this.elementAttributes.get(elementName) || [];
    const requiredAttrs = this.requiredAttributes.get(elementName) || [];
    const description = this.elementDescriptions.get(elementName) || '';
    
    let content = `## ${elementName}\n\n`;
    
    if (description) {
      content += `${description}\n\n`;
    }
    
    if (attributes.length > 0) {
      content += `### Attributes\n\n`;
      for (const attr of attributes) {
        const isRequired = requiredAttrs.includes(attr);
        const enumValues = this.attributeEnums.get(attr);
        
        content += `- **${attr}**${isRequired ? ' *(required)*' : ''}\n`;
        
        if (enumValues) {
          content += `  - Values: ${enumValues.map(v => `\`${v}\``).join(', ')}\n`;
        }
      }
    }
    
    return content;
  }
}
````

### Element Position Detection

```typescript
private findElementAtPosition(text: string, offset: number): string | null {
  // Find the element tag that contains the cursor position
  const beforeCursor = text.substring(0, offset);
  const afterCursor = text.substring(offset);
  
  // Look for element name around cursor
  const elementMatch = beforeCursor.match(/<(\w+)[^>]*$/);
  if (elementMatch) {
    return elementMatch[1];
  }
  
  // Check if cursor is on element name in closing tag
  const closingMatch = beforeCursor.match(/<\/(\w+)$/);
  if (closingMatch) {
    return closingMatch[1];
  }
  
  return null;
}
```

## Syntax Highlighting

### TextMate Grammar (`syntaxes/rmc-xml.tmLanguage.json`)

The syntax highlighting uses a hierarchical approach with different scopes for different element types:

```json
{
  "name": "RMC XML",
  "scopeName": "text.xml.rmc",
  "patterns": [
    { "include": "#rmc-elements" },
    { "include": "#xml-comment" }
  ],
  "repository": {
    "rmc-elements": {
      "patterns": [
        { "include": "#rmc-root-elements" },
        { "include": "#rmc-message-elements" },
        { "include": "#rmc-action-elements" },
        { "include": "#xml-element" }
      ]
    }
  }
}
```

### Element Classification

Elements are classified into different categories for styling:

1. **Root Elements** (`entity.name.tag.root.rmc.xml`):
   - `EtaRsccat`, `ZetaMessage`

2. **Message Elements** (`entity.name.tag.message.rmc.xml`):
   - `BetaEntry`, `LambdaActions`, `ThetaActions`

3. **Action Elements** (`entity.name.tag.action.rmc.xml`):
   - `DeltaAction`, `OmegaA`, `SigmaDiag`

4. **Generic Elements** (`entity.name.tag.xml`):
   - All other elements

## Communication Flow

### Typical Request Flow

```
1. User types '<' in editor
   ↓
2. VS Code sends textDocument/completion request
   ↓
3. Server receives request via JSON-RPC
   ↓
4. CompletionProvider.provideCompletions() called
   ↓
5. Context detection determines completion type
   ↓
6. Schema lookup finds valid elements/attributes
   ↓
7. CompletionItem[] returned to client
   ↓
8. VS Code displays completion popup
```

### Document Synchronization

```typescript
// Server maintains document cache
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Sync document changes
documents.onDidChangeContent(change => {
  // Validate document on every change
  validateTextDocument(change.document);
});

// Send diagnostics to client
connection.sendDiagnostics({
  uri: document.uri,
  diagnostics: validator.validate(document)
});
```

## Adding New Features

### Adding a New Element Type

1. **Update Schema Hierarchy**:
```typescript
// In completion-provider.ts
private schemaHierarchy = new Map([
  // Add parent-child relationship
  ['ParentElement', ['NewElement', 'ExistingChild']],
  ['NewElement', ['ChildElement1', 'ChildElement2']]
]);
```

2. **Define Element Attributes**:
```typescript
private elementAttributes = new Map([
  ['NewElement', ['attr1', 'attr2', 'attr3']]
]);

private requiredAttributes = new Map([
  ['NewElement', ['attr1']] // attr1 is required
]);
```

3. **Add Attribute Enums** (if needed):
```typescript
private attributeEnums = new Map([
  ['attr2', ['value1', 'value2', 'value3']]
]);
```

4. **Update Hover Documentation**:
```typescript
// In hover-provider.ts
private elementDescriptions = new Map([
  ['NewElement', 'Description of what NewElement does']
]);
```

5. **Update Syntax Highlighting**:
```json
// In rmc-xml.tmLanguage.json
"rmc-new-elements": {
  "name": "meta.tag.xml",
  "begin": "(</?)(NewElement)\\b",
  "beginCaptures": {
    "1": { "name": "punctuation.definition.tag.xml" },
    "2": { "name": "entity.name.tag.new.rmc.xml" }
  }
}
```

### Adding New Validation Rules

1. **Extend SchemaValidator**:
```typescript
// In schema-validator.ts
private validateCustomRule(element: ParsedElement): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  
  // Custom validation logic
  if (element.name === 'SpecialElement') {
    // Check custom constraints
    if (!this.meetsCustomConstraint(element)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: element.range,
        message: 'Custom constraint violation',
        source: 'rmc-xml'
      });
    }
  }
  
  return diagnostics;
}
```

2. **Call from Main Validation**:
```typescript
validate(document: SimpleTextDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  
  // Existing validations...
  
  // Add custom validation
  for (const element of elements) {
    diagnostics.push(...this.validateCustomRule(element));
  }
  
  return diagnostics;
}
```

### Adding New Completion Types

1. **Extend Context Detection**:
```typescript
// In completion-provider.ts
provideCompletions(document: SimpleTextDocument, position: Position): CompletionItem[] {
  // Add new context check
  if (this.isInNewContext(beforeCursor)) {
    return this.getNewContextCompletions(beforeCursor);
  }
  
  // Existing checks...
}

private isInNewContext(beforeCursor: string): boolean {
  // Implement detection logic
  return /* condition */;
}

private getNewContextCompletions(beforeCursor: string): CompletionItem[] {
  // Return appropriate completions
  return [];
}
```

## Performance Considerations

### Efficient Parsing

- **Incremental Updates**: Only reparse changed sections
- **Lazy Evaluation**: Parse elements only when needed
- **Caching**: Cache parsed results until document changes

```typescript
class DocumentCache {
  private cache = new Map<string, ParsedDocument>();
  
  getParsedDocument(uri: string, version: number): ParsedDocument {
    const key = `${uri}:${version}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, this.parseDocument(uri));
    }
    return this.cache.get(key)!;
  }
}
```

### Memory Management

- **Document Cleanup**: Remove cached data for closed documents
- **Bounded Cache**: Limit cache size to prevent memory leaks
- **Weak References**: Use WeakMap where appropriate

### Completion Performance

- **Early Returns**: Exit context detection as soon as possible
- **Efficient Regex**: Use optimized regular expressions
- **Minimal String Operations**: Avoid unnecessary string manipulations

## Debugging Tips

### Server-Side Debugging

1. **Add Logging**:
```typescript
console.log('Completion context:', {
  beforeCursor: beforeCursor.slice(-50),
  isInAttributeValue: this.isInAttributeValue(beforeCursor),
  isInAttributeName: this.isInAttributeName(beforeCursor)
});
```

2. **Use VS Code Output Panel**:
   - View → Output → Select "RMC XML Language Server"

3. **Attach Debugger**:
   - Set breakpoints in TypeScript files
   - Press F5 to launch Extension Development Host
   - Debugger will hit breakpoints

### Client-Side Debugging

1. **Extension Host Console**:
   - Help → Toggle Developer Tools in Extension Development Host
   - Check Console tab for client-side errors

2. **Command Palette**:
   - Use "Developer: Reload Window" to reload extension
   - Use "Developer: Show Running Extensions" to check status

### Common Issues

1. **Completions Not Appearing**:
   - Check trigger characters in server capabilities
   - Verify context detection logic
   - Ensure document language is set to "rmc-xml"

2. **Validation Not Working**:
   - Check diagnostic severity levels
   - Verify range calculations
   - Ensure validation is triggered on document changes

3. **Hover Not Showing**:
   - Check hover provider registration
   - Verify element detection at cursor position
   - Ensure hover content is properly formatted

## Testing Strategy

### Unit Tests

```typescript
// Example test for completion provider
describe('CompletionProvider', () => {
  it('should provide element completions in root context', () => {
    const provider = new CompletionProvider();
    const document = createMockDocument('<');
    const position = { line: 0, character: 1 };
    
    const completions = provider.provideCompletions(document, position);
    
    expect(completions).toContainEqual(
      expect.objectContaining({ label: 'EtaRsccat' })
    );
  });
});
```

### Integration Tests

1. **Create test documents** with various RMC XML structures
2. **Test completion scenarios** systematically
3. **Verify validation** with invalid documents
4. **Check hover information** for all element types

### Manual Testing Checklist

- [ ] Element completion in different contexts
- [ ] Attribute completion for all element types
- [ ] Attribute value completion for enums
- [ ] Closing tag completion
- [ ] Validation of unknown elements
- [ ] Validation of missing required attributes
- [ ] Validation of invalid attribute values
- [ ] Hover documentation for all elements
- [ ] Syntax highlighting for all element categories
- [ ] Language auto-detection
- [ ] Manual language switching

This developer documentation should provide a comprehensive understanding of the codebase architecture and implementation details.