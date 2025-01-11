import { createReadStream } from "fs";
import { JSDOM } from "jsdom";
// src/types/index.ts
// Base interface for all WorldML nodes
interface BaseNode {
    type: string;
    start?: number;
    end?: number;
    loc?: SourceLocation;
}

interface SourceLocation {
    start: Position;
    end: Position;
}

interface Position {
    line: number;
    column: number;
}

// Union type for all possible WorldML nodes
type WorldMLNode =
    | WorldMLProgram
    | WorldMLPage
    | WorldMLLayout
    | WorldMLSection
    | WorldMLElement
    | WorldMLProperty;

// Program is the root node
interface WorldMLProgram extends BaseNode {
    type: "WorldMLProgram";
    body: Array<WorldMLPage | WorldMLLayout | WorldMLElement>;
}

// Page definition
interface WorldMLPage extends BaseNode {
    type: "WorldMLPage";
    name: string;
    properties: WorldMLProperty[];
    children: WorldMLElement[];
    layouts: WorldMLLayout[];
    value?: string;
}

// Layout definition
interface WorldMLLayout extends BaseNode {
    type: "WorldMLLayout";
    name: string;
    properties: WorldMLProperty[];
    children: WorldMLElement[];
    sections: WorldMLSection[];
}

// Section definition
interface WorldMLSection extends BaseNode {
    type: "WorldMLSection";
    name: string;
    properties: WorldMLProperty[];
    children: WorldMLElement[];
}

// Element definition
interface WorldMLElement extends BaseNode {
    type: "WorldMLElement";
    name: string;
    properties: WorldMLProperty[];
    children: WorldMLElement[];
    value?: string;
}

// Property definition
interface WorldMLProperty extends BaseNode {
    type: "WorldMLProperty";
    name: string;
    value: PropertyValue;
}

// Type for property values
type PropertyValue =
    | string
    | number
    | boolean
    | null
    | PropertyValue[]
    | {
          [key: string]: PropertyValue;
      };
enum TokenTypeWML {
    AT_SYMBOL = "AT_SYMBOL",
    IDENTIFIER = "IDENTIFIER",
    OPEN_BRACE = "OPEN_BRACE",
    CLOSE_BRACE = "CLOSE_BRACE",
    COLON = "COLON",
    STRING = "STRING",
    NUMBER = "NUMBER",
    BOOLEAN = "BOOLEAN",
    EOF = "EOF",
}

interface TokenWML {
    type: TokenTypeWML;
    value: any;
}

class WorldMLLexer {
    private input: string;
    private position: number = 0;
    private tokens: TokenWML[] = [];

    constructor(input: string) {
        this.input = input;
    }

    tokenize(): TokenWML[] {
        while (this.position < this.input.length) {
            const char = this.input[this.position];

            if (char === "@") {
                this.tokens.push({ type: TokenTypeWML.AT_SYMBOL, value: "@" });
                this.position++;
            } else if (char === "{") {
                this.tokens.push({ type: TokenTypeWML.OPEN_BRACE, value: "{" });
                this.position++;
            } else if (char === "}") {
                this.tokens.push({
                    type: TokenTypeWML.CLOSE_BRACE,
                    value: "}",
                });
                this.position++;
            } else if (char === ":") {
                this.tokens.push({ type: TokenTypeWML.COLON, value: ":" });
                this.position++;
            } else if (char === '"') {
                this.lexString();
            } else if (/[0-9]/.test(char)) {
                this.lexNumber();
            } else if (/[a-zA-Z]/.test(char)) {
                this.lexIdentifier();
            } else {
                this.position++;
            }
        }

        this.tokens.push({ type: TokenTypeWML.EOF, value: null });
        return this.tokens;
    }

    private lexIdentifier(): void {
        let identifier = "";
        while (
            this.position < this.input.length &&
            /[a-zA-Z0-9-]/.test(this.input[this.position])
        ) {
            identifier += this.input[this.position];
            this.position++;
        }
        if (identifier === "true" || identifier === "false") {
            this.tokens.push({
                type: TokenTypeWML.BOOLEAN,
                value: identifier === "true",
            });
        } else if (identifier) {
            this.tokens.push({
                type: TokenTypeWML.IDENTIFIER,
                value: identifier,
            });
        }
    }

    private lexString(): void {
        this.position++; // Skip opening quote
        let string = "";
        while (
            this.position < this.input.length &&
            this.input[this.position] !== '"'
        ) {
            string += this.input[this.position];
            this.position++;
        }
        this.position++; // Skip closing quote
        this.tokens.push({ type: TokenTypeWML.STRING, value: string });
    }

    private lexNumber(): void {
        let number = "";
        while (
            this.position < this.input.length &&
            /[0-9.]/.test(this.input[this.position])
        ) {
            number += this.input[this.position];
            this.position++;
        }
        this.tokens.push({
            type: TokenTypeWML.NUMBER,
            value: parseFloat(number),
        });
    }
}

class WorldMLParser {
    private tokens: TokenWML[];
    private current: number = 0;

    constructor(tokens: TokenWML[]) {
        this.tokens = tokens;
    }

    parse(): WorldMLProgram {
        const program: WorldMLProgram = {
            type: "WorldMLProgram",
            body: [],
        };

        while (!this.isAtEnd()) {
            const node = this.parseTopLevel();
            if (node) {
                program.body.push(node);
            } else {
                this.advance();
            }
        }

        return program;
    }

    private parseTopLevel():
        | WorldMLPage
        | WorldMLLayout
        | WorldMLElement
        | null {
        if (!this.match(TokenTypeWML.AT_SYMBOL)) return null;

        this.advance();
        const nameToken = this.consume(TokenTypeWML.IDENTIFIER);
        const name = nameToken.value;

        if (name === "page") {
            return this.parsePage();
        }
        return null;
    }

    private parsePage(): WorldMLPage {
        const page: WorldMLPage = {
            type: "WorldMLPage",
            name: "page",
            properties: [],
            children: [],
            layouts: [],
        };

        if (this.match(TokenTypeWML.OPEN_BRACE)) {
            this.advance();

            while (!this.match(TokenTypeWML.CLOSE_BRACE) && !this.isAtEnd()) {
                if (this.match(TokenTypeWML.AT_SYMBOL)) {
                    this.advance();
                    const childToken = this.consume(TokenTypeWML.IDENTIFIER);
                    const childName = childToken.value;
                    if (childName === "layout") {
                        this.advance();
                        const layout = this.parseLayout();
                        page.layouts.push(layout);
                    } else if (childName === "meta") {
                        const meta = this.parseElement(childName);
                        page.children.push(meta);
                    }
                } else {
                    this.advance();
                }
            }
            this.advance();
        }

        return page;
    }

    private parseLayout(): WorldMLLayout {
        const layout: WorldMLLayout = {
            type: "WorldMLLayout",
            name: "layout",
            properties: [],
            children: [],
            sections: [],
        };

        if (this.match(TokenTypeWML.OPEN_BRACE)) {
            this.advance();
            while (!this.match(TokenTypeWML.CLOSE_BRACE) && !this.isAtEnd()) {
                if (this.match(TokenTypeWML.AT_SYMBOL)) {
                    this.advance();
                    const childToken = this.consume(TokenTypeWML.IDENTIFIER);
                    if (childToken.value === "section") {
                        this.advance();
                        const section = this.parseSection();
                        layout.sections.push(section);
                    }
                } else {
                    this.advance();
                }
            }
            this.advance();
        }

        return layout;
    }

    private parseSection(): WorldMLSection {
        const section: WorldMLSection = {
            type: "WorldMLSection",
            name: "section",
            properties: [],
            children: [],
        };

        if (this.match(TokenTypeWML.OPEN_BRACE)) {
            this.advance();
            while (!this.match(TokenTypeWML.CLOSE_BRACE) && !this.isAtEnd()) {
                if (this.match(TokenTypeWML.AT_SYMBOL)) {
                    this.advance();
                    const childToken = this.consume(TokenTypeWML.IDENTIFIER);
                    const element = this.parseElement(childToken.value);
                    section.children.push(element);
                } else if (this.match(TokenTypeWML.STRING)) {
                    const textElement: WorldMLElement = {
                        type: "WorldMLElement",
                        name: "text",
                        value: this.advance().value,
                        properties: [],
                        children: [],
                    };
                    section.children.push(textElement);
                } else {
                    this.advance();
                }
            }
            this.advance();
        }

        return section;
    }

    private parseElement(name: string): WorldMLElement {
        const element: WorldMLElement = {
            type: "WorldMLElement",
            name,
            properties: [],
            children: [],
        };

        if (this.match(TokenTypeWML.OPEN_BRACE)) {
            this.advance();
            while (!this.match(TokenTypeWML.CLOSE_BRACE) && !this.isAtEnd()) {
                if (this.match(TokenTypeWML.IDENTIFIER)) {
                    const prop = this.parseProperty();
                    if (prop) {
                        element.properties.push(prop);
                    }
                } else if (this.match(TokenTypeWML.STRING)) {
                    element.value = this.advance().value;
                } else {
                    this.advance();
                }
            }
            this.advance();
        }

        return element;
    }

    private parseProperty(): WorldMLProperty | null {
        const nameToken = this.advance();
        const name = nameToken.value;

        if (this.match(TokenTypeWML.COLON)) {
            this.advance();
            const value = this.parseValue();
            return {
                type: "WorldMLProperty",
                name,
                value,
            };
        }
        return null;
    }

    private parseValue(): any {
        if (this.match(TokenTypeWML.STRING)) return this.advance().value;
        if (this.match(TokenTypeWML.NUMBER)) return this.advance().value;
        if (this.match(TokenTypeWML.BOOLEAN)) return this.advance().value;
        throw new Error(`Unexpected token type at index ${this.current}`);
    }

    private match(type: TokenTypeWML): boolean {
        if (this.isAtEnd()) return false;
        return this.tokens[this.current].type === type;
    }

    private advance(): TokenWML {
        if (!this.isAtEnd()) this.current++;
        return this.tokens[this.current - 1];
    }

    private consume(type: TokenTypeWML): TokenWML {
        if (this.match(type)) return this.advance();
        throw new Error(
            `Expected token type ${type} but found ${this.tokens[this.current].type} at index ${this.current}`,
        );
    }

    private isAtEnd(): boolean {
        return (
            this.current >= this.tokens.length ||
            this.tokens[this.current].type === TokenTypeWML.EOF
        );
    }
}

const { document } = new JSDOM(`
<!DOCTYPE html>
<html lang="en">

<head>
    <title>My HTML Page</title>
</head>

<body>
</body>

</html>

`).window;
// src/compiler/index.ts
class WorldMLCompiler {
    compile(ast: WorldMLNode): HTMLElement | DocumentFragment {
        if (ast.type === "WorldMLProgram") {
            const fragment = document.createDocumentFragment();
            const body = new Map(ast.body.map((page) => [page.type, page]));
            const worldMLPage = body.get("WorldMLPage");
            if (worldMLPage && worldMLPage.type === "WorldMLPage") {
                // Handle meta information
                worldMLPage.children.forEach((child) => {
                    if (
                        child.type === "WorldMLElement" &&
                        child.name === "meta"
                    ) {
                        this.handleMetaElement(child);
                    }
                });
                // Handle layouts
                worldMLPage.layouts.forEach((layout) => {
                    const layoutElement = this.compileLayout(layout);
                    if (layoutElement) {
                        fragment.appendChild(layoutElement);
                    }
                });
            }
            return fragment;
        }
        return document.createDocumentFragment();
    }

    private handleMetaElement(node: WorldMLElement): void {
        if (node.type === "WorldMLElement") {
            node.properties.forEach((prop) => {
                if (prop && prop.name === "title") {
                    document.title = String(prop.value);
                } else if (prop && prop.name === "description") {
                    const meta = document.createElement("meta");
                    meta.name = prop.name;
                    meta.content = String(prop.value);
                    document.head.appendChild(meta);
                }
            });
        }
    }

    private compileLayout(layout: WorldMLLayout): HTMLElement | null {
        const layoutElement = document.createElement("div");
        layoutElement.classList.add("layout");

        // Handle sections within layout
        layout.sections?.forEach((section) => {
            const sectionElement = this.compileSection(section);

            if (sectionElement) {
                layoutElement.appendChild(sectionElement);
            }
        });

        return layoutElement;
    }

    private compileSection(section: WorldMLSection): HTMLElement | null {
        const sectionElement = document.createElement("section");

        section.children?.forEach((child) => {
            const element = this.compileNode(child);
            if (element) {
                sectionElement.appendChild(element);
            }
        });

        return sectionElement;
    }

    private compileNode(node: WorldMLNode): HTMLElement | null {
        if (node.type !== "WorldMLElement") return null;

        if (node.name === "heading") {
            const element = document.createElement("h1");
            if (node.value) {
                element.textContent = node.value;
            }
            return element;
        }

        const element = document.createElement(this.mapElementName(node.name));

        // Handle node value if it exists
        if (node.value) {
            element.textContent = node.value;
        }

        // Apply properties
        node.properties?.forEach((prop) => {
            this.applyProperty(element, prop.name, prop.value);
        });

        // Add children
        node.children?.forEach((child) => {
            const childElement = this.compileNode(child);
            if (childElement) {
                element.appendChild(childElement);
            }
        });

        return element;
    }

    private mapElementName(name: string): string {
        const elementMap: Record<string, string> = {
            page: "div",
            layout: "div",
            section: "section",
            heading: "h1",
            text: "p",
            button: "button",
            meta: "meta",
        };
        return elementMap[name] || name;
    }

    private applyProperty(
        element: HTMLElement,
        name: string,
        value: any,
    ): void {
        if (name === "action") {
            element.onclick = () => {
                const actionStr = value.toString();
                if (actionStr.startsWith("@navigate")) {
                    const path = actionStr.match(/'([^']+)'/)?.[1];
                    if (path) window.location.href = path;
                }
            };
        } else {
            element.setAttribute(name, value.toString());
        }
    }
}

var readable = createReadStream(__dirname + "/index.wml", {
    encoding: "utf8",
    highWaterMark: 16 * 1024,
});
readable.on("data", (data) => {
    const lexer = new WorldMLLexer(data as string);
    const tokens = lexer.tokenize();
    const parser = new WorldMLParser(tokens);
    const ast = parser.parse();
    console.log(ast);
    const compiler = new WorldMLCompiler();
    const dom = compiler.compile(ast);
    document.body.appendChild(dom);
    console.log(document.documentElement.outerHTML);
});
