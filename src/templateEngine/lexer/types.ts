export enum TokenType {
    // HTML Tags
    HTML_TAG_OPEN = "HTML_TAG_OPEN", // <div>, <span>
    HTML_TAG_CLOSE = "HTML_TAG_CLOSE", // </div>, </span>
    HTML_TAG_SELF_CLOSE = "HTML_TAG_SELF_CLOSE", // <br/>, <img/>

    // Attributes
    ATTRIBUTE_NAME = "ATTRIBUTE_NAME", // class, id, src
    ATTRIBUTE_VALUE = "ATTRIBUTE_VALUE", // "value", 'value'
    EQUALS = "EQUALS", // =

    // DOCTYPE
    DOCTYPE = "DOCTYPE", // <!DOCTYPE html>
    DOCTYPE_PUBLIC = "DOCTYPE_PUBLIC", // PUBLIC
    DOCTYPE_SYSTEM = "DOCTYPE_SYSTEM", // SYSTEM

    // Comments
    COMMENT_START = "COMMENT_START", // <!--
    COMMENT_CONTENT = "COMMENT_CONTENT", // Comment content
    COMMENT_END = "COMMENT_END", // -->

    // CDATA
    CDATA_START = "CDATA_START", // <![CDATA[
    CDATA_CONTENT = "CDATA_CONTENT", // CDATA content
    CDATA_END = "CDATA_END", // ]]>

    // Text Content
    TEXT = "TEXT", // Plain text content
    WHITESPACE = "WHITESPACE", // Spaces, tabs, newlines

    // Special Characters
    ENTITY = "ENTITY", // &amp;, &#123;

    // Processing Instructions
    PI_START = "PI_START", // <?
    PI_TARGET = "PI_TARGET", // xml, php
    PI_CONTENT = "PI_CONTENT", // Processing instruction content
    PI_END = "PI_END", // ?>

    // Script and Style
    SCRIPT_START = "SCRIPT_START", // <script>
    SCRIPT_CONTENT = "SCRIPT_CONTENT", // JavaScript content
    SCRIPT_END = "SCRIPT_END", // </script>
    STYLE_START = "STYLE_START", // <style>
    STYLE_CONTENT = "STYLE_CONTENT", // CSS content
    STYLE_END = "STYLE_END", // </style>

    // Delimiters
    ANGLE_BRACKET_OPEN = "ANGLE_BRACKET_OPEN", // <
    ANGLE_BRACKET_CLOSE = "ANGLE_BRACKET_CLOSE", // >
    FORWARD_SLASH = "FORWARD_SLASH", // /
    QUOTE_DOUBLE = "QUOTE_DOUBLE", // "
    QUOTE_SINGLE = "QUOTE_SINGLE", // '

    // Special Tags
    HTML_START = "HTML_START", // <html>
    HTML_END = "HTML_END", // </html>
    HEAD_START = "HEAD_START", // <head>
    HEAD_END = "HEAD_END", // </head>
    BODY_START = "BODY_START", // <body>
    BODY_END = "BODY_END", // </body>

    // Error Tokens
    INVALID_TAG = "INVALID_TAG", // Malformed tags
    INVALID_ATTRIBUTE = "INVALID_ATTRIBUTE", // Malformed attributes
    UNEXPECTED_CHAR = "UNEXPECTED_CHAR", // Unexpected characters

    // Template Tokens (for template engines)
    TEMPLATE_START = "TEMPLATE_START", // {{ or {%
    TEMPLATE_CONTENT = "TEMPLATE_CONTENT", // Template expression
    TEMPLATE_END = "TEMPLATE_END", // }} or %}

    // XML-Specific
    XML_DECLARATION = "XML_DECLARATION", // <?xml version="1.0"?>
    NAMESPACE_PREFIX = "NAMESPACE_PREFIX", // xmlns:prefix
    NAMESPACE_URI = "NAMESPACE_URI", // URI in xmlns declaration
    EOF = "EOF", //End of source
}
export enum LexerErrorType {
    MALFORMED_TAG = "MALFORMED_TAG",
    UNCLOSED_TAG = "UNCLOSED_TAG",
    UNEXPECTED_CLOSING_TAG = "UNEXPECTED_CLOSING_TAG",
    MALFORMED_ATTRIBUTE = "MALFORMED_ATTRIBUTE",
    UNCLOSED_COMMENT = "UNCLOSED_COMMENT",
    UNCLOSED_CDATA = "UNCLOSED_CDATA",
    UNCLOSED_PROCESSING_INSTRUCTION = "UNCLOSED_PROCESSING_INSTRUCTION",
    INVALID_CHARACTER_REFERENCE = "INVALID_CHARACTER_REFERENCE",
    MISMATCHED_TAG = "MISMATCHED_TAG",
}

export interface LexerError {
    type: LexerErrorType;
    message: string;
    position: {
        line: number;
        column: number;
        start: number;
        end: number;
    };
    context: string;
}
export interface Token {
    type: TokenType;
    value: string;
    position: {
        start: number;
        end: number;
        line: number;
        column: number;
    };
    attributes?: {
        name: string;
        value: string;
    }[];
    metadata?: {
        isVoid?: boolean; // For self-closing elements like <img>
        isCustomElement?: boolean; // For custom elements like <my-component>
        namespace?: string; // For namespaced elements
        raw?: string; // Original raw text
    };
}

// List of void elements (self-closing tags)
export const VOID_ELEMENTS = new Set([
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

// List of raw text elements (elements that contain unescaped text)
export const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

// Special characters that need to be escaped in attributes
export const SPECIAL_CHARS = new Map([
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#39;"],
]);

// Common attribute names that don't require values
export const BOOLEAN_ATTRIBUTES = new Set([
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "defer",
    "disabled",
    "hidden",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "novalidate",
    "open",
    "readonly",
    "required",
    "reversed",
    "selected",
]);
