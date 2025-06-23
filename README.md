# RMC XML Language Support

A Visual Studio Code extension that provides comprehensive language support for RMC (Resource Message Catalog) XML files, commonly used in  Custom development environments.

## 🚀 Features

### Syntax Highlighting
- Custom syntax highlighting for RMC XML elements and attributes
- Proper colorization for element names, attributes, and values
- Support for mixed content and CDATA sections

### Intelligent Auto-completion
- **Element completion**: Context-aware suggestions based on XML schema hierarchy
- **Attribute completion**: Relevant attributes for each element type
- **Value completion**: Enumerated values for specific attributes
- **Closing tag completion**: Automatic closing tag suggestions

### Real-time Validation
- Schema-based validation with immediate error reporting
- Detection of unknown elements and attributes
- Validation of required attributes
- Attribute value validation against allowed enums

### Hover Documentation
- Detailed element and attribute descriptions
- Usage examples and best practices
- Schema information on hover

### Auto-detection
- Automatically detects `.rmc.xml` files
- Smart language mode switching for XML files with RMC content

## 📦 Installation

### Development Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/rmc-xml-lsp.git
   cd rmc-xml-lsp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile the extension**
   ```bash
   npm run compile
   ```

4. **Launch in VS Code**
   - Open the project in VS Code
   - Press `F5` to launch Extension Development Host
   - Open any `.rmc.xml` file to test

### Package Installation (Future)
```bash
code --install-extension rmc-xml-lsp-0.0.1.vsix
```

## 🎯 Usage

1. **Open RMC XML files**: The extension automatically activates for `.rmc.xml` files
2. **Start typing**: Get intelligent completions as you type
3. **Hover for help**: Hover over elements to see documentation
4. **Error detection**: Invalid syntax is highlighted with descriptive error messages

### Example RMC XML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<EtaRsccat UpsilonProduct="MyProduct" TauVersion="1.0">
    <ZetaMessage>
        <BetaEntry PsiKey="error_001" XiContext="error">
            <OmegaA RhoHref="model.slx"/>
            <LambdaActions>
                <DeltaAction MuType="fixthis">
                    <ThetaTxt>Fix this issue</ThetaTxt>
                </DeltaAction>
            </LambdaActions>
        </BetaEntry>
    </ZetaMessage>
</EtaRsccat>
```

## 📋 Supported Elements

| Element | Description | Key Attributes |
|---------|-------------|----------------|
| `EtaRsccat` | Root document element | `UpsilonProduct` (required), `TauVersion` |
| `ZetaMessage` | Message container | - |
| `BetaEntry` | Individual message entry | `PsiKey` (required), `XiContext` |
| `OmegaA` | Custom object link | `RhoHref` (required) |
| `SigmaDiag` | Diagnostic UI link | `PhiObjP`, `ChiObjU` (both required) |
| `LambdaActions` | Action container | `XiExFixThese` |
| `DeltaAction` | Specific action | `MuType` (required), `LambdaId` |

## 🏗️ Architecture

```
rmc-xml-lsp/
├── 📄 package.json                    # Extension manifest
├── 📁 client/                         # VS Code extension client
│   ├── 📄 src/extension.ts           # Extension entry point
│   ├── 📄 package.json               # Client dependencies
│   └── 📄 tsconfig.json              # Client TypeScript config
├── 📁 server/                         # Language server implementation
│   ├── 📄 src/server.ts              # Language server logic
│   ├── 📄 package.json               # Server dependencies
│   └── 📄 tsconfig.json              # Server TypeScript config
├── 📁 syntaxes/                       # Syntax highlighting
│   └── 📄 rmc-xml.tmLanguage.json    # TextMate grammar
└── 📄 language-configuration.json     # Language configuration
```

## 🛠️ Development

### Prerequisites
- Node.js 16+ 
- npm 7+
- VS Code 1.74+

### Build Commands
```bash
# Compile all components
npm run compile

# Watch for changes
npm run watch

# Install all dependencies
npm install
```

### Language Server Protocol
This extension implements the Language Server Protocol (LSP) with:
- **Client**: VS Code extension that communicates with the language server
- **Server**: Node.js process that provides language features
- **Communication**: JSON-RPC over stdio

### Adding New Features
1. **Schema updates**: Modify the schema definitions in `server.ts`
2. **Syntax highlighting**: Update `rmc-xml.tmLanguage.json`
3. **Language features**: Extend the language server capabilities

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Ensure backward compatibility

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/rmc-xml-lsp/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/YOUR_USERNAME/rmc-xml-lsp/discussions)
- **Documentation**: [Wiki](https://github.com/YOUR_USERNAME/rmc-xml-lsp/wiki)

## 📈 Roadmap

- [ ] Enhanced schema validation
- [ ] Code formatting support
- [ ] Snippet templates
- [ ] Multi-file project support
- [ ] Integration with  Custom tools
- [ ] Performance optimizations

## 🏷️ Changelog

### v0.0.1 (Initial Release)
- ✅ Basic syntax highlighting
- ✅ Element and attribute auto-completion
- ✅ Schema-based validation
- ✅ Hover documentation
- ✅ Auto-detection of RMC XML files
- ✅ Language server architecture

---

**Made with ❤️ for the  Custom community**