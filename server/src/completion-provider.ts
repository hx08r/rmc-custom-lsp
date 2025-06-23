import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver/node';

interface SimpleTextDocument {
  getText(): string;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
}

export class CompletionProvider {
  // Define the schema hierarchy - what elements can contain what
  private schemaHierarchy = new Map([
    // Root level - only EtaRsccat allowed
    ['ROOT', ['EtaRsccat']],
    
    // EtaRsccat can contain ZetaMessage
    ['EtaRsccat', ['ZetaMessage']],
    
    // ZetaMessage can contain BetaEntry
    ['ZetaMessage', ['BetaEntry']],
    
    // BetaEntry can contain these elements
    ['BetaEntry', ['OmegaA', 'SigmaDiag', 'LambdaActions', 'RandomElement1']],
    
    // LambdaActions/ThetaActions can contain these
    ['LambdaActions', ['DeltaAction', 'InsertActions', 'ActionCatalog', 'RandomElement3']],
    ['ThetaActions', ['DeltaAction', 'InsertActions', 'ActionCatalog', 'RandomElement3']],
    
    // DeltaAction can contain these
    ['DeltaAction', ['EpsilonCmd', 'ZetaParams', 'EtaCargs', 'ThetaTxt', 'IotaMsg']],
    
    // Other containers
    ['ZetaParams', ['BetaPrm']],
    ['BetaPrm', ['GammaObj', 'DeltaName', 'EpsilonVal']],
    ['EtaCargs', ['PhiCarg']],
    ['PhiCarg', ['PsiTxtPrompt', 'ChiDefCmd', 'OmegaEnumCmd', 'SigmaEnum', 'RandomElement2']],
    ['IotaMsg', ['BetaArg']],
    ['BetaArg', ['OmegaA']],
    ['InsertActions', ['BetaArg']],
    ['ActionCatalog', ['BetaArg']],
    
    // Elements that can contain OmegaA and SigmaDiag
    ['RhoCommandType', ['OmegaA', 'SigmaDiag']],
    ['AlphaActionTxtType', ['OmegaA', 'SigmaDiag']],
    ['EpsilonCmd', ['OmegaA', 'SigmaDiag']],
    ['ChiDefCmd', ['OmegaA', 'SigmaDiag']],
    ['OmegaEnumCmd', ['OmegaA', 'SigmaDiag']],
    ['GammaObj', ['OmegaA', 'SigmaDiag']],
    ['ThetaTxt', ['OmegaA', 'SigmaDiag']]
  ]);

  // Define attributes for each element
  private elementAttributes = new Map([
    ['EtaRsccat', ['TauVersion', 'UpsilonProduct', 'ChiLocale', 'OmegaDecorateCxxNames']],
    ['BetaEntry', ['PsiKey', 'PhiTranslate', 'MuCdata', 'NuNote', 'XiContext', 'RandomAttr1']],
    ['OmegaA', ['RhoHref', 'SigmaFileName', 'TauStyle', 'UpsilonId', 'RandomAttr2']],
    ['SigmaDiag', ['PhiObjP', 'ChiObjU', 'PsiObjN']],
    ['DeltaAction', ['KappaEnabled', 'LambdaId', 'MuType', 'NuBtn', 'XiRetvalue']],
    ['ThetaActions', ['XiExFixThese', 'KappaEnabled', 'MuOrder']],
    ['PhiCarg', ['TauName', 'UpsilonType', 'PhiTranslate']],
    ['OmegaMsgActType', ['GammaId']],
    ['EpsilonSomeType', ['KappaEnabled', 'LambdaFromId', 'MuActionableIdentifiers']],
    ['ZetaActionCatalogIndirectType', ['KappaEnabled', 'LambdaFromId', 'MuIds', 'NuId']]
  ]);

  // Define required attributes
  private requiredAttributes = new Map([
    ['EtaRsccat', ['UpsilonProduct']],
    ['BetaEntry', ['PsiKey']],
    ['OmegaA', ['RhoHref']],
    ['SigmaDiag', ['PhiObjP', 'ChiObjU']],
    ['DeltaAction', ['MuType']]
  ]);

  // Define attribute value enums
  private attributeEnums = new Map([
    ['XiContext', ['error', 'warning', 'diagnostic', 'textstring', 'paramobject']],
    ['UpsilonType', ['text', 'menu']],
    ['MuType', ['fixthis', 'suggest', 'suppress', 'help', 'doc']],
    ['NuBtn', ['none', 'fix', 'resolve', 'apply', 'open', 'suppress', 'disable']],
    ['XiRetvalue', ['false', 'no', 'true', 'yes']],
    ['XiExFixThese', ['yes', 'no']],
    ['MuOrder', ['block']]
  ]);

  provideCompletions(document: SimpleTextDocument, position: Position): CompletionItem[] {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const beforeCursor = text.substring(0, offset);
    
    console.log('Completion context:', {
      beforeCursor: beforeCursor.slice(-50), // Last 50 chars for debugging
      isInAttributeValue: this.isInAttributeValue(beforeCursor),
      isInAttributeName: this.isInAttributeName(beforeCursor),
      isInClosingTag: this.isInClosingTag(beforeCursor),
      isInElementTag: this.isInElementTag(beforeCursor)
    });

    // Check what type of completion we need - ORDER MATTERS!
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

  private getContextAwareElementCompletions(beforeCursor: string): CompletionItem[] {
    const parentElement = this.findParentElement(beforeCursor);
    const allowedChildren = this.schemaHierarchy.get(parentElement) || [];
    
    return allowedChildren.map(element => ({
      label: element,
      kind: CompletionItemKind.Class,
      detail: `${element} element`,
      insertText: this.getElementInsertText(element),
      insertTextFormat: 2 // Snippet format
    }));
  }

  private getElementInsertText(element: string): string {
    const requiredAttrs = this.requiredAttributes.get(element) || [];
    if (requiredAttrs.length > 0) {
      const attrSnippets = requiredAttrs.map((attr, index) => `${attr}="$${index + 1}"`).join(' ');
      return `${element} ${attrSnippets}>$${requiredAttrs.length + 1}</${element}>`;
    }
    return `${element}>$1</${element}>`;
  }

  private findParentElement(beforeCursor: string): string {
    const lines = beforeCursor.split('\n');
    const tagStack: string[] = [];
    
    // Simple parser to find the current parent element
    for (const line of lines) {
      const tagMatches = line.match(/<\/?(\w+)[^>]*>/g);
      if (tagMatches) {
        for (const tag of tagMatches) {
          if (tag.startsWith('</')) {
            // Closing tag
            const tagName = tag.match(/<\/(\w+)/)?.[1];
            if (tagName) {
              const lastIndex = tagStack.lastIndexOf(tagName);
              if (lastIndex !== -1) {
                tagStack.splice(lastIndex, 1);
              }
            }
          } else if (!tag.endsWith('/>')) {
            // Opening tag (not self-closing)
            const tagName = tag.match(/<(\w+)/)?.[1];
            if (tagName) {
              tagStack.push(tagName);
            }
          }
        }
      }
    }
    
    return tagStack.length > 0 ? tagStack[tagStack.length - 1] : 'ROOT';
  }

  private getAttributeCompletions(beforeCursor: string): CompletionItem[] {
    // Look for the current element being typed
    const currentTagMatch = beforeCursor.match(/<(\w+)([^>]*)$/);
    if (!currentTagMatch) return [];
    
    const elementName = currentTagMatch[1];
    const attributesPart = currentTagMatch[2];
    
    console.log('Attribute completion for:', elementName, 'attributes part:', attributesPart);
    
    const attributes = this.elementAttributes.get(elementName) || [];
    const requiredAttrs = this.requiredAttributes.get(elementName) || [];
    
    // Get already present attributes to avoid duplicates
    const existingAttrs = this.getExistingAttributes(attributesPart);
    
    console.log('Available attributes:', attributes, 'Existing:', existingAttrs);
    
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

  private getExistingAttributes(attributesPart: string): string[] {
    const attrMatches = attributesPart.match(/(\w+)=/g);
    return attrMatches ? attrMatches.map(match => match.replace('=', '')) : [];
  }

  private getAttributeValueCompletions(beforeCursor: string): CompletionItem[] {
    const attrMatch = beforeCursor.match(/(\w+)="[^"]*$/);
    if (!attrMatch) return [];
    
    const attributeName = attrMatch[1];
    const enumValues = this.attributeEnums.get(attributeName);
    
    if (!enumValues) return [];
    
    return enumValues.map(value => ({
      label: value,
      kind: CompletionItemKind.EnumMember,
      detail: `Valid value for ${attributeName}`,
      insertText: value
    }));
  }

  private getClosingTagCompletions(text: string, position: Position): CompletionItem[] {
    const beforeCursor = text.substring(0, text.split('\n').slice(0, position.line + 1).join('\n').length + position.character);
    const openTags = this.findOpenTags(beforeCursor);
    
    return openTags.map(tag => ({
      label: tag,
      kind: CompletionItemKind.Class,
      detail: `Close ${tag} element`,
      insertText: `${tag}>`
    }));
  }

  private findOpenTags(beforeCursor: string): string[] {
    const tagStack: string[] = [];
    const tagRegex = /<\/?(\w+)[^>]*>/g;
    let match;
    
    while ((match = tagRegex.exec(beforeCursor)) !== null) {
      const isClosing = match[0].startsWith('</');
      const tagName = match[1];
      
      if (isClosing) {
        const lastIndex = tagStack.lastIndexOf(tagName);
        if (lastIndex !== -1) {
          tagStack.splice(lastIndex, 1);
        }
      } else if (!match[0].endsWith('/>')) {
        tagStack.push(tagName);
      }
    }
    
    return tagStack.reverse();
  }

  private isInElementTag(beforeCursor: string): boolean {
    const lastOpenBracket = beforeCursor.lastIndexOf('<');
    const lastCloseBracket = beforeCursor.lastIndexOf('>');
    
    if (lastOpenBracket <= lastCloseBracket) return false;
    
    const tagContent = beforeCursor.substring(lastOpenBracket);
    // We're in element tag if we haven't hit a space yet (no attributes started)
    return !tagContent.includes(' ') && !tagContent.startsWith('</');
  }

  private isInAttributeName(beforeCursor: string): boolean {
    const lastOpenBracket = beforeCursor.lastIndexOf('<');
    const lastCloseBracket = beforeCursor.lastIndexOf('>');
    
    if (lastOpenBracket <= lastCloseBracket) return false;
    
    const tagContent = beforeCursor.substring(lastOpenBracket);
    
    // Don't trigger for closing tags
    if (tagContent.startsWith('</')) return false;
    
    // We're in attribute name if:
    // 1. We have a space (attributes section started)
    // 2. We're not currently in an attribute value
    // 3. We're not right after an equals sign
    const hasSpace = tagContent.includes(' ');
    const inAttributeValue = this.isInAttributeValue(beforeCursor);
    const afterEquals = tagContent.endsWith('=');
    
    console.log('isInAttributeName check:', {
      tagContent,
      hasSpace,
      inAttributeValue,
      afterEquals,
      result: hasSpace && !inAttributeValue && !afterEquals
    });
    
    return hasSpace && !inAttributeValue && !afterEquals;
  }

  private isInAttributeValue(beforeCursor: string): boolean {
    const lastOpenBracket = beforeCursor.lastIndexOf('<');
    const lastCloseBracket = beforeCursor.lastIndexOf('>');
    if (lastOpenBracket <= lastCloseBracket) return false;
    
    const tagContent = beforeCursor.substring(lastOpenBracket);
    
    // Check if we're inside quotes
    const doubleQuoteCount = (tagContent.match(/"/g) || []).length;
    const singleQuoteCount = (tagContent.match(/'/g) || []).length;
    
    // If we have an odd number of quotes, we're inside a quoted value
    const inDoubleQuotes = doubleQuoteCount % 2 === 1;
    const inSingleQuotes = singleQuoteCount % 2 === 1;
    
    return inDoubleQuotes || inSingleQuotes;
  }

  private isInClosingTag(beforeCursor: string): boolean {
    return beforeCursor.endsWith('</');
  }
}