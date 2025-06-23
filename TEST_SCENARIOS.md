# RMC XML Language Support - Test Scenarios

This document outlines the test scenarios for validating the RMC XML Language Support extension functionality.

## Test Environment Setup

### Prerequisites
- VS Code 1.74+
- RMC XML Language Support extension installed
- Sample RMC XML files for testing

### Test Data Files
Create these test files in a `test-files/` directory:

#### Valid RMC XML Sample
```xml
<!-- test-files/valid-sample.rmc.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<EtaRsccat UpsilonProduct="TestProduct" TauVersion="1.0">
    <ZetaMessage>
        <BetaEntry PsiKey="test_key_001" XiContext="error">
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

#### Invalid RMC XML Sample
```xml
<!-- test-files/invalid-sample.rmc.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<EtaRsccat>
    <ZetaMessage>
        <BetaEntry XiContext="invalid_context">
            <UnknownElement/>
        </BetaEntry>
    </ZetaMessage>
</EtaRsccat>
```

---

## Test Scenario 1: Auto-completion for Root Elements

### Objective
Verify that the extension provides correct auto-completion suggestions for root-level elements.

### Test Steps
1. Create a new file with `.rmc.xml` extension
2. Type the XML declaration: `<?xml version="1.0" encoding="UTF-8"?>`
3. On a new line, type `<` and wait for auto-completion

### Expected Results
- ✅ Auto-completion popup appears
- ✅ `EtaRsccat` appears as the primary suggest
- ✅ suggest includes proper snippet with closing tag
- ✅ No invalid root elements are suggested

### Pass Criteria
- Auto-completion triggers within 500ms
- `EtaRsccat` is the first suggest
- Selecting the suggest inserts: `<EtaRsccat>$1</EtaRsccat>`

---

## Test Scenario 2: Attribute Auto-completion

### Objective
Verify that the extension provides correct attribute suggestions for specific elements.

### Test Steps
1. Open `valid-sample.rmc.xml`
2. Position cursor inside the `<EtaRsccat` tag after the element name
3. Type a space and trigger auto-completion (Ctrl+Space)
4. Repeat for `<BetaEntry` and `<DeltaAction` elements

### Expected Results
- ✅ **EtaRsccat attributes**: `UpsilonProduct`, `TauVersion`, `ChiLocale`, `OmegaDecorateCxxNames`
- ✅ **BetaEntry attributes**: `PsiKey`, `PhiTranslate`, `MuCdata`, `NuNote`, `XiContext`, `RandomAttr1`
- ✅ **DeltaAction attributes**: `KappaEnabled`, `LambdaId`, `MuType`, `NuBtn`, `XiRetvalue`
- ✅ Required attributes are marked as "required"
- ✅ Optional attributes are marked as "optional"

### Pass Criteria
- All expected attributes appear in suggestions
- Required attributes are clearly indicated
- Attribute insertion includes `="$1"` snippet

---

## Test Scenario 3: Attribute Value Auto-completion

### Objective
Verify that the extension provides enumerated values for specific attributes.

### Test Steps
1. Open `valid-sample.rmc.xml`
2. Position cursor inside `XiContext=""` attribute value
3. Trigger auto-completion
4. Repeat for `MuType=""` attribute

### Expected Results
- ✅ **XiContext values**: `error`, `warning`, `diagnostic`, `textstring`, `paramobject`
- ✅ **MuType values**: `fixthis`, `suggest`, `suppress`, `help`, `doc`
- ✅ Only valid enumerated values are suggested
- ✅ No arbitrary text suggestions appear

### Pass Criteria
- Correct enum values appear for each attribute
- Invalid values are not suggested
- Selection replaces the current value

---

## Test Scenario 4: Schema Validation - Missing Required Attributes

### Objective
Verify that the extension detects and reports missing required attributes.

### Test Steps
1. Create a new `.rmc.xml` file
2. Add the following content:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <EtaRsccat>
       <ZetaMessage>
           <BetaEntry>
               <OmegaA/>
           </BetaEntry>
       </ZetaMessage>
   </EtaRsccat>
   ```
3. Save the file and observe error indicators

### Expected Results
- ✅ Error on `<EtaRsccat>`: Missing required attribute `UpsilonProduct`
- ✅ Error on `<BetaEntry>`: Missing required attribute `PsiKey`
- ✅ Error on `<OmegaA>`: Missing required attribute `RhoHref`
- ✅ Errors appear in Problems panel
- ✅ Red squiggly underlines on problematic elements

### Pass Criteria
- All missing required attributes are detected
- Error messages are descriptive and helpful
- Errors appear within 2 seconds of file save

---

## Test Scenario 5: Schema Validation - Invalid Attribute Values

### Objective
Verify that the extension validates attribute values against allowed enumerations.

### Test Steps
1. Open `invalid-sample.rmc.xml`
2. Modify to include invalid attribute values:
   ```xml
   <BetaEntry PsiKey="test" XiContext="invalid_context">
   ```
3. Add invalid MuType:
   ```xml
   <DeltaAction MuType="invalid_type">
   ```
4. Save and observe validation errors

### Expected Results
- ✅ Error on `XiContext="invalid_context"`: Invalid value, expected one of: error, warning, diagnostic, textstring, paramobject
- ✅ Error on `MuType="invalid_type"`: Invalid value, expected one of: fixthis, suggest, suppress, help, doc
- ✅ Valid attribute values do not trigger errors

### Pass Criteria
- Invalid enum values are detected
- Error messages list valid alternatives
- Valid values pass validation

---

## Test Scenario 6: Schema Validation - Unknown Elements

### Objective
Verify that the extension detects unknown or invalid elements.

### Test Steps
1. Create a test file with unknown elements:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <EtaRsccat UpsilonProduct="test">
       <ZetaMessage>
           <UnknownElement>
               <AnotherInvalidElement/>
           </UnknownElement>
       </ZetaMessage>
   </EtaRsccat>
   ```
2. Save and observe validation

### Expected Results
- ✅ Error on `<UnknownElement>`: Unknown element
- ✅ Error on `<AnotherInvalidElement>`: Unknown element
- ✅ Known elements (`EtaRsccat`, `ZetaMessage`) do not trigger errors

### Pass Criteria
- All unknown elements are flagged
- Known elements pass validation
- Error messages are clear and actionable

---

## Test Scenario 7: Hover Documentation

### Objective
Verify that hover functionality provides helpful documentation for elements and attributes.

### Test Steps
1. Open `valid-sample.rmc.xml`
2. Hover over the `EtaRsccat` element name
3. Hover over the `BetaEntry` element name
4. Hover over the `UpsilonProduct` attribute
5. Hover over the `XiContext` attribute

### Expected Results
- ✅ **EtaRsccat hover**: "Root element for RMC XML documents"
- ✅ **BetaEntry hover**: "Individual message entry with key and context"
- ✅ **UpsilonProduct hover**: Attribute description and usage information
- ✅ **XiContext hover**: Description and valid values listed
- ✅ Hover appears within 300ms
- ✅ Hover content is well-formatted and readable

### Pass Criteria
- Hover information appears for all tested elements
- Content is informative and accurate
- Formatting is clean and professional

---

## Test Scenario 8: File Association and Language Detection

### Objective
Verify that the extension correctly identifies and activates for RMC XML files.

### Test Steps
1. Create files with different extensions:
   - `test.rmc.xml`
   - `test.xml` (with RMC content)
   - `test.txt` (with RMC content)
2. Open each file in VS Code
3. Check the language mode indicator in the status bar
4. Verify syntax highlighting is applied

### Expected Results
- ✅ **`.rmc.xml` files**: Automatically detected as "RMC XML" language
- ✅ **`.xml` files**: May need manual language selection
- ✅ **`.txt` files**: Require manual language mode change
- ✅ Syntax highlighting applies correctly for RMC XML mode
- ✅ Extension features (completion, validation) work in RMC XML mode

### Pass Criteria
- `.rmc.xml` files are automatically recognized
- Language mode can be manually set for other file types
- All extension features work regardless of file extension when RMC XML mode is active

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Extension compiled and installed
- [ ] Test files created in `test-files/` directory
- [ ] VS Code restarted to ensure clean state

### Test Execution
- [ ] Test Scenario 1: Root element auto-completion
- [ ] Test Scenario 2: Attribute auto-completion
- [ ] Test Scenario 3: Attribute value auto-completion
- [ ] Test Scenario 4: Missing required attributes validation
- [ ] Test Scenario 5: Invalid attribute values validation
- [ ] Test Scenario 6: Unknown elements validation
- [ ] Test Scenario 7: Hover documentation
- [ ] Test Scenario 8: File association and language detection

### Post-Test Validation
- [ ] All scenarios pass their criteria
- [ ] No console errors in VS Code Developer Tools
- [ ] Extension performance is acceptable (< 2s for most operations)
- [ ] Memory usage remains stable during testing

---

## Troubleshooting Common Issues

### Extension Not Activating
- Check that the file has `.rmc.xml` extension
- Verify extension is installed and enabled
- Restart VS Code

### Auto-completion Not Working
- Ensure cursor is in correct position
- Try manual trigger with Ctrl+Space
- Check for TypeScript/JavaScript conflicts

### Validation Not Showing
- Save the file to trigger validation
- Check Problems panel (View → Problems)
- Verify file is recognized as RMC XML

### Performance Issues
- Check for large files (> 1MB)
- Monitor CPU usage during operations
- Consider file complexity and nesting depth

---

## Success Criteria Summary

The RMC XML Language Support extension passes testing when:

1. ✅ All 8 test scenarios pass their individual criteria
2. ✅ No critical errors occur during testing
3. ✅ Performance remains acceptable across all operations
4. ✅ User experience is smooth and intuitive
5. ✅ Extension integrates well with VS Code ecosystem

---

