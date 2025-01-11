enum TokenType {
    TEXT,
    VARIABLE_START, // {{
    VARIABLE_END, // }}
    BLOCK_START, // {%
    BLOCK_END, // %}
    IDENTIFIER,
    DOT,
    KEYWORD,
    SPACE,
}

class Token {
    constructor(
        public type: TokenType,
        public value: string,
        public position: number,
    ) {}
}

interface ASTNode {
    type: string;
    value?: any;
    children?: ASTNode[];
    falseChildren?: ASTNode[];
}

class TemplateLexer {
    private pos = 0;
    private input: string;

    constructor(input: string) {
        this.input = input;
    }

    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (this.pos < this.input.length) {
            const char = this.input[this.pos];

            if (this.input.slice(this.pos, this.pos + 2) === "{{") {
                if (
                    tokens.length > 0 &&
                    tokens[tokens.length - 1].type === TokenType.TEXT
                ) {
                    tokens[tokens.length - 1].value =
                        tokens[tokens.length - 1].value.trimEnd();
                }
                tokens.push(
                    new Token(TokenType.VARIABLE_START, "{{", this.pos),
                );
                this.pos += 2;
                this.skipWhitespace();
                continue;
            }

            if (this.input.slice(this.pos, this.pos + 2) === "}}") {
                tokens.push(new Token(TokenType.VARIABLE_END, "}}", this.pos));
                this.pos += 2;
                continue;
            }

            if (this.input.slice(this.pos, this.pos + 2) === "{%") {
                if (
                    tokens.length > 0 &&
                    tokens[tokens.length - 1].type === TokenType.TEXT
                ) {
                    tokens[tokens.length - 1].value =
                        tokens[tokens.length - 1].value.trimEnd();
                }
                tokens.push(new Token(TokenType.BLOCK_START, "{%", this.pos));
                this.pos += 2;
                this.skipWhitespace();
                continue;
            }

            if (this.input.slice(this.pos, this.pos + 2) === "%}") {
                tokens.push(new Token(TokenType.BLOCK_END, "%}", this.pos));
                this.pos += 2;
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                let value = "";
                while (
                    this.pos < this.input.length &&
                    /[a-zA-Z0-9_]/.test(this.input[this.pos])
                ) {
                    value += this.input[this.pos];
                    this.pos++;
                }
                const type = [
                    "if",
                    "else",
                    "endif",
                    "for",
                    "endfor",
                    "in",
                ].includes(value)
                    ? TokenType.KEYWORD
                    : TokenType.IDENTIFIER;
                tokens.push(new Token(type, value, this.pos - value.length));
                this.skipWhitespace();
                continue;
            }

            if (char === ".") {
                tokens.push(new Token(TokenType.DOT, ".", this.pos));
                this.pos++;
                continue;
            }

            // Accumulate text content
            let textContent = "";
            while (this.pos < this.input.length) {
                const nextTwo = this.input.slice(this.pos, this.pos + 2);
                if (
                    nextTwo === "{{" ||
                    nextTwo === "}}" ||
                    nextTwo === "{%" ||
                    nextTwo === "%}"
                ) {
                    break;
                }
                textContent += this.input[this.pos];
                this.pos++;
            }
            if (textContent) {
                tokens.push(
                    new Token(
                        TokenType.TEXT,
                        textContent,
                        this.pos - textContent.length,
                    ),
                );
            }
        }

        return tokens;
    }

    private skipWhitespace(): void {
        while (
            this.pos < this.input.length &&
            /\s/.test(this.input[this.pos])
        ) {
            this.pos++;
        }
    }
}

class TemplateParser {
    private tokens: Token[];
    private current = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens.filter((token) => token.type !== TokenType.SPACE);
    }

    parse(): ASTNode {
        const nodes: ASTNode[] = [];

        while (this.current < this.tokens.length) {
            const token = this.tokens[this.current];

            if (token.type === TokenType.VARIABLE_START) {
                nodes.push(this.parseVariable());
            } else if (token.type === TokenType.BLOCK_START) {
                nodes.push(this.parseBlock());
            } else if (token.type === TokenType.TEXT) {
                nodes.push({
                    type: "text",
                    value: token.value,
                });
                this.current++;
            } else {
                this.current++;
            }
        }

        return {
            type: "root",
            children: nodes,
        };
    }

    private parseVariable(): ASTNode {
        this.current++; // Skip {{
        const parts: string[] = [];

        while (this.current < this.tokens.length) {
            const token = this.tokens[this.current];

            if (token.type === TokenType.VARIABLE_END) {
                this.current++;
                break;
            }

            if (
                token.type === TokenType.IDENTIFIER ||
                token.type === TokenType.DOT
            ) {
                parts.push(token.value);
            }

            this.current++;
        }

        return {
            type: "variable",
            value: parts.join(""),
        };
    }

    private parseBlock(): ASTNode {
        this.current++; // Skip {%
        const token = this.tokens[this.current];

        if (!token || token.type !== TokenType.KEYWORD) {
            throw new Error(
                `Expected keyword after {% at position ${token?.position}, found ${token?.value}`,
            );
        }

        if (token.value === "if") {
            return this.parseIf();
        } else if (token.value === "for") {
            return this.parseFor();
        }

        throw new Error(`Unknown block type: ${token.value}`);
    }

    private parseIf(): ASTNode {
        this.current++; // Skip if keyword

        const condition = this.tokens[this.current];
        if (!condition || condition.type !== TokenType.IDENTIFIER) {
            throw new Error(
                `Expected condition after if at position ${this.tokens[this.current - 1].position}`,
            );
        }
        this.current++;

        // Skip to block end
        while (
            this.current < this.tokens.length &&
            this.tokens[this.current].type !== TokenType.BLOCK_END
        ) {
            this.current++;
        }
        this.current++; // Skip %}

        const trueNodes: ASTNode[] = [];
        const falseNodes: ASTNode[] = [];
        let currentNodes = trueNodes;

        while (this.current < this.tokens.length) {
            const token = this.tokens[this.current];

            if (
                token.type === TokenType.BLOCK_START &&
                this.tokens[this.current + 1]?.value === "endif"
            ) {
                this.current += 3; // Skip {% endif %}
                break;
            }

            if (
                token.type === TokenType.BLOCK_START &&
                this.tokens[this.current + 1]?.value === "else"
            ) {
                currentNodes = falseNodes;
                this.current += 3; // Skip {% else %}
                continue;
            }

            if (token.type === TokenType.VARIABLE_START) {
                currentNodes.push(this.parseVariable());
            } else if (token.type === TokenType.BLOCK_START) {
                currentNodes.push(this.parseBlock());
            } else if (token.type === TokenType.TEXT) {
                currentNodes.push({
                    type: "text",
                    value: token.value,
                });
                this.current++;
            } else {
                this.current++;
            }
        }

        return {
            type: "if",
            value: condition.value,
            children: trueNodes,
            falseChildren: falseNodes,
        };
    }

    private parseFor(): ASTNode {
        this.current++; // Skip for keyword

        const item = this.tokens[this.current];
        if (!item || item.type !== TokenType.IDENTIFIER) {
            throw new Error(
                `Expected item identifier after for at position ${this.tokens[this.current - 1].position}`,
            );
        }
        this.current++;

        const inKeyword = this.tokens[this.current];
        if (
            !inKeyword ||
            inKeyword.type !== TokenType.KEYWORD ||
            inKeyword.value !== "in"
        ) {
            throw new Error(
                `Expected 'in' keyword after ${item.value} at position ${item.position}`,
            );
        }
        this.current++;

        const collection = this.tokens[this.current];
        if (!collection || collection.type !== TokenType.IDENTIFIER) {
            throw new Error(
                `Expected collection identifier after 'in' at position ${inKeyword.position}`,
            );
        }
        this.current++;

        // Skip to block end
        while (
            this.current < this.tokens.length &&
            this.tokens[this.current].type !== TokenType.BLOCK_END
        ) {
            this.current++;
        }
        this.current++; // Skip %}

        const children: ASTNode[] = [];

        while (this.current < this.tokens.length) {
            const token = this.tokens[this.current];

            if (
                token.type === TokenType.BLOCK_START &&
                this.tokens[this.current + 1]?.value === "endfor"
            ) {
                this.current += 3; // Skip {% endfor %}
                break;
            }

            if (token.type === TokenType.VARIABLE_START) {
                children.push(this.parseVariable());
            } else if (token.type === TokenType.BLOCK_START) {
                children.push(this.parseBlock());
            } else if (token.type === TokenType.TEXT) {
                children.push({
                    type: "text",
                    value: token.value,
                });
                this.current++;
            } else {
                this.current++;
            }
        }

        return {
            type: "for",
            value: { item: item.value, collection: collection.value },
            children,
        };
    }
}

class TemplateCompiler {
    private ast: ASTNode;

    constructor(ast: ASTNode) {
        this.ast = ast;
    }

    compile(): (context: any) => string {
        return (context: any) => this.evaluate(this.ast, context);
    }

    private evaluate(node: ASTNode, context: any): string {
        switch (node.type) {
            case "root":
                return (
                    node.children
                        ?.map((child) => this.evaluate(child, context))
                        .join("") ?? ""
                );

            case "text":
                return node.value;

            case "variable":
                return String(this.resolveValue(node.value, context) ?? "");

            case "if":
                const condition = this.resolveValue(node.value, context);
                if (condition) {
                    return (
                        node.children
                            ?.map((child) => this.evaluate(child, context))
                            .join("") ?? ""
                    );
                } else {
                    return (
                        node.falseChildren
                            ?.map((child) => this.evaluate(child, context))
                            .join("") ?? ""
                    );
                }

            case "for":
                const { item, collection } = node.value;
                const items = this.resolveValue(collection, context);
                if (!Array.isArray(items)) return "";

                return items
                    .map((itemValue) => {
                        const itemContext = { ...context, [item]: itemValue };
                        return (
                            node.children
                                ?.map((child) =>
                                    this.evaluate(child, itemContext),
                                )
                                .join("") ?? ""
                        );
                    })
                    .join("");

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    private resolveValue(path: string, context: any): any {
        return path.split(".").reduce((obj, key) => {
            if (obj === undefined || obj === null) return undefined;
            return obj[key];
        }, context);
    }
}

class TemplateRuntime {
    render(template: string, context: any): string {
        try {
            const lexer = new TemplateLexer(template);
            const tokens = lexer.tokenize();
            const parser = new TemplateParser(tokens);
            const ast = parser.parse();
            const compiler = new TemplateCompiler(ast);
            return compiler.compile()(context);
        } catch (error) {
            throw new Error(
                `Template error: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}
// Example usage
const runtime = new TemplateRuntime();
const template = `<html>
    <head>
        <title>{{ title }}</title>
    </head>
    <body>
        {% if user %}
            <h1>Welcome, {{ user.name }}!</h1>
            {% for item in items %}
                <div class="item">{{ item.name }} - {{ item.price }}</div>
            {% endfor %}
        {% else %}
            <h1>Welcome, Guest!</h1>
        {% endif %}
    </body>
</html>`;

const context = {
    title: "My Shop",
    user: { name: "John" },
    items: [
        { name: "Item 1", price: 10 },
        { name: "Item 2", price: 20 },
    ],
};

console.log(runtime.render(template, context));
