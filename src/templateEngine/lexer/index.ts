import { Scanner } from "./scanner";
import { TokenType, Token, LexerError, LexerErrorType } from "./types";

// ErrorHandler for Lexical Error
class ErrorHandler {
    private errors: string[] = [];

    addError(message: string, line: number, column: number): void {
        this.errors.push(`Error at line ${line}, column ${column}: ${message}`);
    }

    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    getErrors(): string[] {
        return [...this.errors];
    }
}

// Symbol table for tracking
class SymbolTable {
    private symbols: Map<string, any> = new Map();

    insert(name: string, type: string): void {
        this.symbols.set(name, { name, type });
    }

    lookup(name: string) {
        return this.symbols.get(name);
    }

    exists(name: string) {
        return this.symbols.has(name);
    }
}
// List of void elements (self-closing tags)
const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);

class LexerState {
    tagStack: string[] = [];
    errors: LexerError[] = [];
    inScript: boolean = false;
    inStyle: boolean = false;
    inCDATA: boolean = false;
    inProcessingInstruction: boolean = false;
}
export class Lexer {
    private scanner: Scanner;
    private errorHandler: ErrorHandler;
    private symbols: SymbolTable;
    private tokens: Token[] = [];
    private state: LexerState;

    private start: number = 0;
    private line: number = 1;
    private column: number = 1;

    private static readonly HTML_ENTITIES = new Map<string, string>([
        ["&lt;", "<"],
        ["&gt;", ">"],
        ["&amp;", "&"],
        ["&quot;", '"'],
        ["&apos;", "'"],
        ["&nbsp;", " "],
        ["&copy;", "©"],
        ["&reg;", "®"],
        ["&trade;", "™"],
        ["&mdash;", "—"],
        ["&ndash;", "–"],
        ["&euro;", "€"],
        ["&pound;", "£"],
        ["&cent;", "¢"],
    ]);

    constructor(source: string) {
        this.scanner = new Scanner(source);
        this.errorHandler = new ErrorHandler();
        this.symbols = new SymbolTable();
        this.state = new LexerState();
    }
    // Add error handling method
    private addError(
        type: LexerErrorType,
        message: string,
        contextLength: number = 10,
    ) {
        const position = this.getPosition();
        const context = this.scanner.getSourceSegment(
            Math.max(0, this.start - contextLength),
            Math.min(this.scanner.getLength(), this.start + contextLength),
        );

        this.state.errors.push({
            type,
            message,
            position,
            context,
        });
    }
    tokenize(): { tokens: Token[]; errors: LexerError[] } {
        while (this.scanner.hasNext()) {
            this.start = this.scanner.getCursor();
            const char = this.scanner.next();
            try {
                if (this.state.inScript) {
                    this.handleScriptContent();
                    continue;
                }
                if (this.state.inStyle) {
                    this.handleStyleContent();
                    continue;
                }
                if (this.state.inCDATA) {
                    this.handleCDATAContent();
                    continue;
                }
                if (this.state.inProcessingInstruction) {
                    this.handleProcessingInstruction();
                    continue;
                }
                switch (char) {
                    case "<":
                        if (this.scanner.hasNext()) {
                            if (this.scanner.peek() === "!") {
                                this.handleSpecialTag();
                            } else if (this.scanner.peek() === "/") {
                                this.handleClosingTag();
                            } else if (this.scanner.peek() === "?") {
                                this.handleProcessingInstructionStart();
                            } else {
                                this.handleOpeningTag();
                            }
                        }
                        break;
                    case "&":
                        this.handleEntity();
                        break;
                    case "\n":
                        this.line++;
                        this.column = 1;
                        //this.addToken({
                        //    type: TokenType.WHITESPACE,
                        //    value: "\n",
                        //    position: this.getPosition(),
                        //});
                        break;
                    case " ":
                    case "\t":
                    case "\r":
                        //this.addToken({
                        //    type: TokenType.WHITESPACE,
                        //    value: char,
                        //    position: this.getPosition(),
                        //});
                        break;
                    default:
                        if (!this.isWhitespace(char)) {
                            this.handleText(char);
                        }
                        break;
                }
            } catch (err) {
                this.handleError(err as Error);
            }
            this.column++;
        }
        this.addToken({
            type: TokenType.EOF,
            value: "END_OF_FILE",
            position: this.getPosition(),
        });
        this.validateFinalState();
        return { tokens: this.tokens, errors: this.state.errors };
    }

    private handleScriptContent() {
        let content = "";
        while (this.scanner.hasNext()) {
            if (this.checkEndTag("script")) {
                this.state.inScript = false;
                this.addToken({
                    type: TokenType.SCRIPT_CONTENT,
                    value: content,
                    position: this.getPosition(),
                });
                return;
            }
            content += this.scanner.next();
        }
        this.addError(LexerErrorType.UNCLOSED_TAG, "Unclosed <script> tag");
    }

    private handleStyleContent(): void {
        let content = "";
        while (this.scanner.hasNext()) {
            if (this.checkEndTag("style")) {
                this.state.inStyle = false;
                this.addToken({
                    type: TokenType.STYLE_CONTENT,
                    value: content,
                    position: this.getPosition(),
                });
                return;
            }
            content += this.scanner.next();
        }
        this.addError(LexerErrorType.UNCLOSED_TAG, "Unclosed <style> tag");
    }

    private handleCDATAContent(): void {
        let content = "";
        while (this.scanner.hasNext()) {
            if (this.checkCDATAEnd()) {
                this.state.inCDATA = false;
                this.addToken({
                    type: TokenType.CDATA_CONTENT,
                    value: content,
                    position: this.getPosition(),
                });
                return;
            }
            content += this.scanner.next();
        }

        this.addError(LexerErrorType.UNCLOSED_CDATA, "Unclosed CDATA section");
    }

    private handleEntity(): void {
        let entity = "&";
        this.scanner.mark();

        while (
            this.scanner.hasNext() &&
            !this.isWhitespace(this.scanner.peek()) &&
            this.scanner.peek() !== "<"
        ) {
            const char = this.scanner.next();
            entity += char;
            if (char === ";") {
                if (Lexer.HTML_ENTITIES.has(entity)) {
                    this.addToken({
                        type: TokenType.ENTITY,
                        value: entity,
                        position: this.getPosition(),
                    });
                    return;
                }
                break;
            }
        }

        this.scanner.reset();
        this.addError(
            LexerErrorType.INVALID_CHARACTER_REFERENCE,
            `Invalid HTML entity: ${entity}`,
        );
        this.handleText("&");
    }
    private checkEndTag(tagName: string): boolean {
        if (this.scanner.peek() === "<" && this.scanner.peekNext() === "/") {
            this.scanner.mark();
            this.scanner.next(); // <
            this.scanner.next(); // /

            let endTag = "";
            while (this.scanner.hasNext() && this.scanner.peek() !== ">") {
                endTag += this.scanner.next();
            }

            if (endTag.toLowerCase() === tagName.toLowerCase()) {
                this.scanner.next(); // >
                return true;
            }
            this.scanner.reset();
        }
        return false;
    }

    private checkCDATAEnd(): boolean {
        if (
            this.scanner.peek() === "]" &&
            this.scanner.peekNext() === "]" &&
            this.scanner.peekNext(1) === ">"
        ) {
            this.scanner.next(); // ]
            this.scanner.next(); // ]
            this.scanner.next(); // >
            return true;
        }
        return false;
    }

    private handleProcessingInstructionStart(): void {
        this.scanner.next(); // consume ?
        this.state.inProcessingInstruction = true;
        let target = "";

        while (
            this.scanner.hasNext() &&
            !this.isWhitespace(this.scanner.peek()) &&
            this.scanner.peek() !== "?"
        ) {
            target += this.scanner.next();
        }

        this.addToken({
            type: TokenType.PI_TARGET,
            value: target,
            position: this.getPosition(),
        });
    }

    private handleProcessingInstruction(): void {
        let content = "";
        while (this.scanner.hasNext()) {
            if (
                this.scanner.peek() === "?" &&
                this.scanner.peekNext() === ">"
            ) {
                this.scanner.next(); // ?
                this.scanner.next(); // >
                this.state.inProcessingInstruction = false;
                this.addToken({
                    type: TokenType.PI_CONTENT,
                    value: content,
                    position: this.getPosition(),
                });
                return;
            }
            content += this.scanner.next();
        }
        this.addError(
            LexerErrorType.UNCLOSED_PROCESSING_INSTRUCTION,
            "Unclosed processing instruction",
        );
    }

    private validateFinalState(): void {
        if (this.state.tagStack.length > 0) {
            this.state.tagStack.forEach((tag) => {
                this.addError(
                    LexerErrorType.UNCLOSED_TAG,
                    `Unclosed tag: ${tag}`,
                    20,
                );
            });
        }
    }

    private handleError(error: Error): void {
        this.addError(LexerErrorType.MALFORMED_TAG, error.message, 20);
        // Try to recover by moving to the next tag
        while (this.scanner.hasNext() && this.scanner.peek() !== "<") {
            this.scanner.next();
        }
    }
    private handleSpecialTag(): void {
        this.scanner.next(); // consume '!'
        if (this.scanner.peek() === "D") {
            this.handleDoctype();
        } else if (
            this.scanner.peek() === "-" &&
            this.scanner.peekNext() === "-"
        ) {
            this.handleComment();
        }
    }
    private handleDoctype() {
        let content = "<!";

        // Check for DOCTYPE

        while (this.scanner.hasNext() && this.scanner.peek() !== ">") {
            content += this.scanner.next();
        }
        if (this.scanner.hasNext()) {
            content += this.scanner.next(); // consume '>'
        }

        this.addToken({
            type: TokenType.DOCTYPE,
            value: content,
            position: this.getPosition(),
        });
    }
    private handleComment() {
        let content = "";
        this.scanner.next(); // consume first '-'
        this.scanner.next(); // consume second '-'

        while (this.scanner.hasNext()) {
            const char = this.scanner.next();
            if (
                char === "-" &&
                this.scanner.peek() === "-" &&
                this.scanner.peekNext() === ">"
            ) {
                this.scanner.next(); // consume second '-'
                this.scanner.next(); // consume '>'
                break;
            }
            content += char;
        }

        this.addToken({
            type: TokenType.COMMENT_CONTENT,
            value: content,
            position: this.getPosition(),
        });
    }

    private handleOpeningTag() {
        let tagName = this.readTagName();
        const attributes = this.handleAttributes();
        const isSelfClosing = this.scanner.peek() === "/";

        if (isSelfClosing) {
            this.scanner.next(); // consume '/'
        }

        if (this.scanner.hasNext()) {
            this.scanner.next(); // consume '>'
        }
        const tag = tagName.toLowerCase();
        if (tag === "style") {
            this.state.inStyle = true;
        } else if (tag === "script") {
            this.state.inScript = true;
        }
        if (!isSelfClosing && !VOID_ELEMENTS.has(tag)) {
            this.state.tagStack.push(tagName);
        }
        this.addToken({
            type: isSelfClosing
                ? TokenType.HTML_TAG_SELF_CLOSE
                : TokenType.HTML_TAG_OPEN,
            value: tagName,
            position: this.getPosition(),
            attributes,
            metadata: {
                isVoid: VOID_ELEMENTS.has(tagName.toLowerCase()),
                isCustomElement: tagName.includes("-"),
                raw: `<${tagName}${isSelfClosing ? "/" : ""}>`,
            },
        });
    }

    private handleClosingTag() {
        this.scanner.next(); // consume '/'
        let tagName = "";

        while (this.scanner.hasNext() && this.scanner.peek() !== ">") {
            tagName += this.scanner.next();
        }

        if (this.scanner.hasNext()) {
            this.scanner.next(); // consume '>'
        }
        const lastTag = this.state.tagStack.pop();
        if (lastTag !== tagName) {
            this.addError(
                LexerErrorType.MISMATCHED_TAG,
                `Mismatched closing tag: expected ${lastTag}, found ${tagName}`,
            );
        }

        const tagLower = tagName.toLowerCase();
        if (tagLower === "script") {
            this.state.inScript = false;
        } else if (tagLower === "style") {
            this.state.inStyle = false;
        }
        this.addToken({
            type: TokenType.HTML_TAG_CLOSE,
            value: tagName,
            position: this.getPosition(),
            metadata: {
                raw: `</${tagName}>`,
            },
        });
    }
    private readTagName(): string {
        let tagName = "";
        while (
            this.scanner.hasNext() &&
            !this.isWhitespace(this.scanner.peek()) &&
            this.scanner.peek() !== ">" &&
            this.scanner.peek() !== "/"
        ) {
            tagName += this.scanner.next();
        }
        return tagName;
    }
    private handleAttributes(): { name: string; value: string }[] {
        const attributes: { name: string; value: string }[] = [];

        while (
            this.scanner.hasNext() &&
            this.scanner.peek() !== ">" &&
            this.scanner.peek() !== "/"
        ) {
            this.skipWhitespace();

            if (this.scanner.peek() === ">" || this.scanner.peek() === "/") {
                break;
            }

            const name = this.readAttributeName();
            let value = "";

            this.skipWhitespace();
            if (this.scanner.peek() === "=") {
                this.scanner.next(); // consume '='
                this.skipWhitespace();
                value = this.readAttributeValue();
            }

            if (name) {
                attributes.push({ name, value });
            }
        }

        return attributes;
    }

    private handleText(firstChar: string): void {
        let text = firstChar;
        while (
            this.scanner.hasNext() &&
            this.scanner.peek() !== "<" &&
            this.scanner.peek() !== "&"
        ) {
            text += this.scanner.next();
        }

        if (text.trim().length > 0) {
            this.addToken({
                type: TokenType.TEXT,
                value: text,
                position: this.getPosition(),
            });
        }
    }
    private readAttributeName(): string {
        let name = "";
        while (
            this.scanner.hasNext() &&
            !this.isWhitespace(this.scanner.peek()) &&
            this.scanner.peek() !== "=" &&
            this.scanner.peek() !== ">" &&
            this.scanner.peek() !== "/"
        ) {
            name += this.scanner.next();
        }
        return name;
    }

    private readAttributeValue(): string {
        let value = "";
        const quote = this.scanner.peek() === '"' ? '"' : "'";

        if (this.scanner.peek() === quote) {
            this.scanner.next(); // consume opening quote
            while (this.scanner.hasNext() && this.scanner.peek() !== quote) {
                value += this.scanner.next();
            }
            if (this.scanner.hasNext()) {
                this.scanner.next(); // consume closing quote
            }
        }
        return value;
    }

    private addToken(type: Token) {
        this.tokens.push(type);
    }
    private isWhitespace(char: string): boolean {
        return /\s/.test(char);
    }

    private skipWhitespace() {
        while (
            this.scanner.hasNext() &&
            this.isWhitespace(this.scanner.peek())
        ) {
            this.scanner.next();
            this.column++;
        }
    }
    private getPosition() {
        return {
            start: this.start,
            end: this.scanner.getCursor(),
            line: this.line,
            column: this.column,
        };
    }

    getErrors(): string[] {
        return this.errorHandler.getErrors();
    }

    getSymbolTable(): SymbolTable {
        return this.symbols;
    }
}
