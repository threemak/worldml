import { Scanner } from "./scanner";

// Tokens types
enum TokenType {
    EXPRESSION = "EXPRESSION",
    ATTRIBUTE = "ATTRIBUTE",
    IDENTIFIER = "IDENTIFIER",
    TEXT = "TEXT",
    TAG_OPEN = "TAG_OPEN",
    TAG_CLOSE = "TAG_CLOSE",
    STRING = "STRING",
    OPERATOR = "OPERATOR",
    NUMBER = "NUMBER",
    KEYWORD = "KEYWORD",
    PUNCTUATION = "PUNCTUATION",
    EOF = "EOF",
}

// Token class represent Lexical tokens
class Token {
    constructor(
        public type: TokenType,
        public value: string,
        public line: number,
        public column: number,
    ) {}
    toString() {
        return `Token(${this.type}, '${this.value}', line=${this.line},col=${this.column})`;
    }
}

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

export class Lexer {
    private scanner: Scanner;
    private errorHandler: ErrorHandler;
    private symbolTable: SymbolTable;
    private line: number = 1;
    private column: number = 0;
    private tokens: Token[] = [];

    constructor(source: string) {
        this.scanner = new Scanner(source);
        this.errorHandler = new ErrorHandler();
        this.symbolTable = new SymbolTable();
    }
    private keywords: Set<string> = new Set([
        "if",
        "else",
        "while",
        "for",
        "function",
        "return",
        "var",
        "const",
        "let",
    ]);
    tokenize(): Token[] {
        while (this.scanner.hasNext()) {
            const char = this.scanner.next();
            this.column++;

            switch (char) {
                case " ":
                case "\t":
                    // Skip whitespace and tabs
                    break;
                // check for next line
                case "\n":
                    this.line++;
                    this.column = 0;
                    break;
                // Check for strings
                case '"':
                case "'":
                    this.readString(char);
                    break;
                // check for forward Slash
                case "/":
                    if (this.scanner.peek() === "/") {
                        this.skipLineComment();
                    } else if (this.scanner.peek() === "*") {
                        this.skipBlockComment();
                    } else {
                        this.addToken(TokenType.OPERATOR, "/");
                    }
                    break;
                default:
                    if (this.isNumber(char)) {
                        this.readNumber(char);
                    } else if (this.isAlphabet(char)) {
                        this.readAlphabet(char);
                    } else if (this.isOperator(char)) {
                        this.readOperator(char);
                    }
                    break;
            }
        }
        this.addToken(TokenType.EOF, "");
        return this.tokens;
    }
    private isNumber(char: string) {
        return char >= "0" && char <= "9";
    }
    private isAlphabet(char: string): boolean {
        return (
            (char >= "a" && char <= "z") ||
            (char >= "A" && char <= "Z") ||
            char === "_"
        );
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlphabet(char) || this.isNumber(char);
    }

    private isOperator(char: string): boolean {
        return "+-*/%=<>!&|^".includes(char);
    }

    private readString(quote: string) {
        let value = "";
        let startColumn = this.column;

        const error = this.errorHandler.addError(
            "Unterminated String",
            this.line,
            startColumn,
        );
        while (this.scanner.hasNext() && this.scanner.peek() !== quote) {
            if (this.scanner.peek() === "\n") {
                error;
                return;
            }
            value += this.scanner.next();
            this.column++;

            if (!this.scanner.hasNext()) {
                error;
                return;
            }
            this.scanner.next();
            this.column++;
            this.addToken(TokenType.STRING, value);
        }
    }

    private readNumber(firstChar: string): void {
        let value = firstChar;
        let hasDecimal = false;

        while (this.scanner.hasNext()) {
            const char = this.scanner.peek();
            if (this.isNumber(char)) {
                value += this.scanner.next();
                this.column++;
            } else if (char === "." && !hasDecimal) {
                value += this.scanner.next();
                this.column++;
                hasDecimal = true;
            } else {
                break;
            }
        }

        this.addToken(TokenType.NUMBER, value);
    }
    private readAlphabet(firstChar: string): void {
        let value = firstChar;

        while (
            this.scanner.hasNext() &&
            this.isAlphaNumeric(this.scanner.peek())
        ) {
            value += this.scanner.next();
            this.column++;
        }

        const type = this.keywords.has(value)
            ? TokenType.KEYWORD
            : TokenType.IDENTIFIER;
        this.addToken(type, value);

        if (type === TokenType.IDENTIFIER && !this.symbolTable.exists(value)) {
            this.symbolTable.insert(value, "variable");
        }
    }
    private readOperator(firstChar: string): void {
        let value = firstChar;
        const nextChar = this.scanner.peek();

        // Handle two-character operators
        if (this.isOperator(nextChar)) {
            value += this.scanner.next();
            this.column++;
        }

        this.addToken(TokenType.OPERATOR, value);
    }
    private skipLineComment() {
        while (this.scanner.hasNext() && this.scanner.peek() !== "\n") {
            this.scanner.next();
            this.column++;
        }
    }
    private skipBlockComment() {
        let nestingLevel = 1;
        let startLine = this.line;
        let startColumn = this.column;
        // consuming the opening *
        this.scanner.next();
        this.column++;

        while (this.scanner.hasNext() && nestingLevel > 0) {
            const char = this.scanner.next();
            this.column++;
            if (char === "\n") {
                this.line++;
                this.column = 0;
            } else if (char === "/" && this.scanner.peek() === "*") {
                nestingLevel++;
                this.scanner.next();
                this.column++;
            } else if (char === "*" && this.scanner.peek() === "/") {
                nestingLevel--;
                this.scanner.next();
                this.column++;
            }
        }
        if (nestingLevel > 0) {
            this.errorHandler.addError(
                "Unterminated block comment",
                startLine,
                startColumn,
            );
        }
    }

    private addToken(type: TokenType, value: string) {
        this.tokens.push(new Token(type, value, this.line, this.column));
    }

    getErrors(): string[] {
        return this.errorHandler.getErrors();
    }

    getSymbolTable(): SymbolTable {
        return this.symbolTable;
    }
}
