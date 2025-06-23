import { Range, Position } from 'vscode-languageserver/node';

export interface ValidationError {
  range: Range;
  message: string;
}

export class SchemaValidator {
  private schemaElements = new Set([
    'EtaRsccat', 'ZetaMessage', 'BetaEntry', 'LambdaActions', 'ThetaActions',
    'DeltaAction', 'OmegaA', 'SigmaDiag', 'EpsilonCmd', 'ZetaParams',
    'BetaPrm', 'GammaObj', 'DeltaName', 'EpsilonVal', 'EtaCargs',
    'PhiCarg', 'PsiTxtPrompt', 'ChiDefCmd', 'OmegaEnumCmd', 'SigmaEnum',
    'ThetaTxt', 'IotaMsg', 'BetaArg', 'InsertActions', 'ActionCatalog',
    'RandomElement1', 'RandomElement2', 'RandomElement3', 'GammaParamsType',
    'AlphaActionTxtType', 'RhoCommandType', 'TauPromptType', 'UpsilonUserMsgType',
    'PhiCargType', 'ChiCargsType', 'PsiAMsgArgumentType', 'OmegaMsgActType',
    'BetaParamType', 'GammaParamsType', 'EpsilonSomeType',
    'ZetaActionCatalogIndirectType', 'PiIntroType', 'GammaHLType', 'DeltaDType'
  ]);

  private requiredAttributes = new Map([
    ['BetaEntry', ['PsiKey']],
    ['EtaRsccat', ['UpsilonProduct']],
    ['OmegaA', ['RhoHref']],
    ['SigmaDiag', ['PhiObjP', 'ChiObjU']],
    ['DeltaAction', ['MuType']]
  ]);

  private attributeEnums = new Map([
    ['XiContext', ['error', 'warning', 'diagnostic', 'textstring', 'paramobject']],
    ['UpsilonType', ['text', 'menu']],
    ['MuType', ['fixthis', 'suggest', 'suppress', 'help', 'doc']],
    ['NuBtn', ['none', 'fix', 'resolve', 'apply', 'open', 'suppress', 'disable']],
    ['XiRetvalue', ['false', 'no', 'true', 'yes']],
    ['XiExFixThese', ['yes', 'no']],
    ['MuOrder', ['block']]
  ]);

  validateSimple(text: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = text.split('\n');

    // Check for root element
    if (!text.includes('<EtaRsccat')) {
      errors.push({
        range: Range.create(Position.create(0, 0), Position.create(0, 10)),
        message: 'Root element must be "EtaRsccat"'
      });
    }

    // Simple element validation
    lines.forEach((line, lineIndex) => {
      // Check for unknown elements
      const elementMatches = line.match(/<(\w+)/g);
      if (elementMatches) {
        elementMatches.forEach(match => {
          const elementName = match.substring(1);
          if (!this.schemaElements.has(elementName) && !elementName.startsWith('/')) {
            const startPos = line.indexOf(match);
            errors.push({
              range: Range.create(
                Position.create(lineIndex, startPos),
                Position.create(lineIndex, startPos + match.length)
              ),
              message: `Unknown element: ${elementName}`
            });
          }
        });
      }

      // Check for required attributes
      this.validateRequiredAttributes(line, lineIndex, errors);

      // Check attribute values
      const attrMatches = line.match(/(\w+)="([^"]+)"/g);
      if (attrMatches) {
        attrMatches.forEach(match => {
          const matchResult = match.match(/(\w+)="([^"]+)"/);
          if (matchResult) {
            const [, attrName, value] = matchResult;
            this.validateAttributeValue(attrName, value, errors, lineIndex, line.indexOf(match));
          }
        });
      }
    });

    return errors;
  }

  private validateRequiredAttributes(line: string, lineIndex: number, errors: ValidationError[]): void {
    // Check BetaEntry requires PsiKey
    if (line.includes('<BetaEntry') && !line.includes('PsiKey=')) {
      errors.push({
        range: Range.create(Position.create(lineIndex, 0), Position.create(lineIndex, line.length)),
        message: 'BetaEntry element requires PsiKey attribute'
      });
    }

    // Check EtaRsccat requires UpsilonProduct
    if (line.includes('<EtaRsccat') && !line.includes('UpsilonProduct=')) {
      errors.push({
        range: Range.create(Position.create(lineIndex, 0), Position.create(lineIndex, line.length)),
        message: 'EtaRsccat element requires UpsilonProduct attribute'
      });
    }

    // Check OmegaA requires RhoHref
    if (line.includes('<OmegaA') && !line.includes('RhoHref=')) {
      errors.push({
        range: Range.create(Position.create(lineIndex, 0), Position.create(lineIndex, line.length)),
        message: 'OmegaA element requires RhoHref attribute'
      });
    }

    // Check SigmaDiag requires PhiObjP and ChiObjU
    if (line.includes('<SigmaDiag')) {
      if (!line.includes('PhiObjP=')) {
        errors.push({
          range: Range.create(Position.create(lineIndex, 0), Position.create(lineIndex, line.length)),
          message: 'SigmaDiag element requires PhiObjP attribute'
        });
      }
      if (!line.includes('ChiObjU=')) {
        errors.push({
          range: Range.create(Position.create(lineIndex, 0), Position.create(lineIndex, line.length)),
          message: 'SigmaDiag element requires ChiObjU attribute'
        });
      }
    }

    // Check DeltaAction requires MuType
    if (line.includes('<DeltaAction') && !line.includes('MuType=')) {
      errors.push({
        range: Range.create(Position.create(lineIndex, 0), Position.create(lineIndex, line.length)),
        message: 'DeltaAction element requires MuType attribute'
      });
    }
  }

  private validateAttributeValue(attrName: string, value: string, errors: ValidationError[], lineIndex: number, charIndex: number): void {
    const enumValues = this.attributeEnums.get(attrName);
    if (enumValues && !enumValues.includes(value)) {
      errors.push({
        range: Range.create(
          Position.create(lineIndex, charIndex),
          Position.create(lineIndex, charIndex + attrName.length + value.length + 3)
        ),
        message: `Invalid value "${value}" for attribute ${attrName}. Valid values: ${enumValues.join(', ')}`
      });
    }

    // Pattern validation
    if (attrName === 'PsiKey' || attrName === 'UpsilonProduct') {
      const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!pattern.test(value)) {
        errors.push({
          range: Range.create(
            Position.create(lineIndex, charIndex),
            Position.create(lineIndex, charIndex + attrName.length + value.length + 3)
          ),
          message: `Invalid ${attrName} format. Must match pattern: [a-zA-Z_][a-zA-Z0-9_]*`
        });
      }
    }

    // Boolean validation
    if (['PhiTranslate', 'MuCdata', 'KappaEnabled', 'OmegaDecorateCxxNames'].includes(attrName)) {
      if (!['true', 'false'].includes(value.toLowerCase())) {
        errors.push({
          range: Range.create(
            Position.create(lineIndex, charIndex),
            Position.create(lineIndex, charIndex + attrName.length + value.length + 3)
          ),
          message: `Invalid boolean value "${value}" for attribute ${attrName}. Must be "true" or "false"`
        });
      }
    }
  }

  // Additional validation methods can be added here
  validateXMLStructure(text: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for basic XML structure
    if (!text.trim().startsWith('<?xml')) {
      errors.push({
        range: Range.create(Position.create(0, 0), Position.create(0, 5)),
        message: 'XML document should start with XML declaration'
      });
    }

    // Check for balanced tags (simple implementation)
    const openTags: string[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const tagMatches = line.match(/<\/?(\w+)[^>]*>/g);
      if (tagMatches) {
        tagMatches.forEach(tag => {
          if (tag.startsWith('</')) {
            // Closing tag
            const tagName = tag.match(/<\/(\w+)/)?.[1];
            if (tagName) {
              const lastOpenIndex = openTags.lastIndexOf(tagName);
              if (lastOpenIndex === -1) {
                errors.push({
                  range: Range.create(Position.create(lineIndex, line.indexOf(tag)), Position.create(lineIndex, line.indexOf(tag) + tag.length)),
                  message: `Closing tag </${tagName}> has no matching opening tag`
                });
              } else {
                openTags.splice(lastOpenIndex, 1);
              }
            }
          } else if (!tag.endsWith('/>')) {
            // Opening tag (not self-closing)
            const tagName = tag.match(/<(\w+)/)?.[1];
            if (tagName) {
              openTags.push(tagName);
            }
          }
        });
      }
    });

    // Check for unclosed tags
    openTags.forEach(tagName => {
      errors.push({
        range: Range.create(Position.create(0, 0), Position.create(0, 10)),
        message: `Unclosed tag: ${tagName}`
      });
    });

    return errors;
  }
}