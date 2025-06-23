import { Hover, Position, MarkupKind } from 'vscode-languageserver/node';

// Simple TextDocument interface for our use
interface SimpleDocument {
  getText(): string;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
}

interface ElementDocumentation {
  description: string;
  details: string;
  attributes: { [key: string]: string };
}

export class HoverProvider {
  private elementDocumentation = new Map<string, ElementDocumentation>([
    ['EtaRsccat', {
      description: 'Root element for RMC resource catalog',
      details: 'Contains version information and message definitions for the resource catalog.',
      attributes: {
        'TauVersion': 'Version number of the resource catalog',
        'UpsilonProduct': 'Product identifier (required)',
        'ChiLocale': 'Locale specification for internationalization',
        'OmegaDecorateCxxNames': 'Whether to decorate C++ names'
      }
    }],
    ['BetaEntry', {
      description: 'Individual message entry with unique key',
      details: 'Represents a single message or diagnostic entry in the catalog. Each entry must have a unique PsiKey.',
      attributes: {
        'PsiKey': 'Unique identifier for this message entry (required)',
        'PhiTranslate': 'Whether this entry should be translated',
        'MuCdata': 'Whether content should be treated as CDATA',
        'NuNote': 'Additional notes for translators',
        'XiContext': 'Context type: error, warning, diagnostic, textstring, paramobject',
        'RandomAttr1': 'Optional integer attribute'
      }
    }],
    ['DeltaAction', {
      description: 'Action definition for user interactions',
      details: 'Defines an action that can be performed by the user, such as fix-it suggestions or help actions.',
      attributes: {
        'MuType': 'Action type: fixthis, suggest, suppress, help, doc (required)',
        'LambdaId': 'Unique identifier for this action',
        'KappaEnabled': 'Whether this action is enabled',
        'NuBtn': 'Button type: none, fix, resolve, apply, open, suppress, disable',
        'XiRetvalue': 'Return value: true, false, yes, no'
      }
    }],
    ['OmegaA', {
      description: 'Hyperlink to Custom objects',
      details: 'Creates a link to a Custom object or model element.',
      attributes: {
        'RhoHref': 'Target reference for the hyperlink (required)',
        'SigmaFileName': 'Associated file name',
        'TauStyle': 'Display style for the link',
        'UpsilonId': 'Unique identifier for the link',
        'RandomAttr2': 'Optional string attribute'
      }
    }],
    ['SigmaDiag', {
      description: 'Diagnostic link to Custom UI',
      details: 'Creates a link to Custom UI elements for diagnostic purposes.',
      attributes: {
        'PhiObjP': 'Object paramobject reference (required)',
        'ChiObjU': 'Object UI reference (required)',
        'PsiObjN': 'Object name for display'
      }
    }],
    ['LambdaActions', {
      description: 'Container for message actions',
      details: 'Groups related actions that can be performed on a message entry.',
      attributes: {
        'XiExFixThese': 'Whether fix-it actions are mutually exclusive',
        'KappaEnabled': 'Whether actions are enabled',
        'MuOrder': 'Ordering strategy for actions'
      }
    }],
    ['ZetaMessage', {
      description: 'Container for message entries',
      details: 'Groups all message entries in the resource catalog.',
      attributes: {}
    }],
    ['ThetaActions', {
      description: 'Advanced action container',
      details: 'Container for complex action definitions with additional features.',
      attributes: {
        'XiExFixThese': 'Whether fix-it actions are mutually exclusive',
        'KappaEnabled': 'Whether actions are enabled',
        'MuOrder': 'Ordering strategy for actions'
      }
    }]
  ]);

  provideHover(document: SimpleDocument, position: Position): Hover | null {
    const text = document.getText();
    const lines = text.split('\n');
    const currentLine = lines[position.line];
    
    // Check if hovering over an element
    const elementMatch = this.getElementAtPosition(currentLine, position.character);
    if (elementMatch) {
      const doc = this.elementDocumentation.get(elementMatch);
      if (doc) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: this.formatElementDocumentation(elementMatch, doc)
          }
        };
      }
    }

    // Check if hovering over an attribute
    const attributeMatch = this.getAttributeAtPosition(currentLine, position.character);
    if (attributeMatch) {
      const { element, attribute } = attributeMatch;
      const elementDoc = this.elementDocumentation.get(element);
      if (elementDoc && elementDoc.attributes[attribute]) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**${attribute}** (${element})\n\n${elementDoc.attributes[attribute]}`
          }
        };
      }
    }

    return null;
  }

  private getElementAtPosition(line: string, character: number): string | null {
    // Look for element tags
    const elementRegex = /<\/?(\w+)/g;
    let match;
    
    while ((match = elementRegex.exec(line)) !== null) {
      const start = match.index + (match[0].startsWith('</') ? 2 : 1);
      const end = start + match[1].length;
      
      if (character >= start && character <= end) {
        return match[1];
      }
    }
    
    return null;
  }

  private getAttributeAtPosition(line: string, character: number): { element: string; attribute: string } | null {
    // Find the element this attribute belongs to
    const beforeCursor = line.substring(0, character);
    const elementMatch = beforeCursor.match(/<(\w+)/);
    if (!elementMatch) return null;
    
    const element = elementMatch[1];
    
    // Find attribute at cursor position
    const attrRegex = /(\w+)(?:\s*=\s*["'][^"']*["'])?/g;
    let match;
    
    while ((match = attrRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[1].length;
      
      if (character >= start && character <= end) {
        return { element, attribute: match[1] };
      }
    }
    
    return null;
  }

  private formatElementDocumentation(elementName: string, doc: ElementDocumentation): string {
    let markdown = `## ${elementName}\n\n${doc.description}\n\n${doc.details}\n\n`;
    
    const attributeKeys = Object.keys(doc.attributes);
    if (attributeKeys.length > 0) {
      markdown += '### Attributes\n\n';
      for (const attr of attributeKeys) {
        markdown += `- **${attr}**: ${doc.attributes[attr]}\n`;
      }
    }
    
    return markdown;
  }
}