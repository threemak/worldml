import { Fragment, } from "./types";
function applyStyles(el, style) {
    if (typeof style === "string") {
        el.setAttribute("style", style);
    }
    else if (style && typeof style === "object") {
        Object.assign(el.style, style);
    }
}
function applyClasses(el, classes) {
    if (typeof classes === "string") {
        el.className = classes;
    }
    else if (Array.isArray(classes)) {
        el.className = classes
            .map((c) => typeof c === "string"
            ? c
            : Object.keys(c)
                .filter((k) => c[k])
                .join(" "))
            .join(" ");
    }
    else if (classes && typeof classes === "object") {
        el.className = Object.keys(classes)
            .filter((k) => classes[k])
            .join(" ");
    }
}
function setRef(ref, value) {
    if (typeof ref === "function") {
        ref(value);
    }
    else if (typeof ref === "object" && ref !== null) {
        ref.value = value;
    }
}
function normalizeChildren(children) {
    return children
        .flat()
        .filter((child) => child != null && child !== false);
}
export function createElement(type, props, ...children) {
    return {
        type,
        props: props || {},
        children: normalizeChildren(children),
        el: null,
        key: props?.key ?? undefined,
    };
}
export function render(vnode, container) {
    const el = createDOMElement(vnode);
    if (el) {
        container.appendChild(el);
        vnode.el = el;
    }
    return el;
}
function isPrimitive(child) {
    return (typeof child === "string" ||
        typeof child === "number" ||
        typeof child === "boolean" ||
        child === null ||
        child === undefined);
}
function isVNode(child) {
    return child != null && typeof child === "object" && "type" in child;
}
function createDOMElement(vnode) {
    // Handle function components
    if (typeof vnode.type === "function") {
        const componentContext = {
            emit: (event, ...args) => {
                const handler = vnode.props[`on${event[0]?.toUpperCase()}${event.slice(1)}`];
                if (typeof handler === "function") {
                    handler(...args);
                }
            },
        };
        const result = vnode.type(vnode.props, componentContext);
        return result ? createDOMElement(result) : null;
    }
    // Handle Fragment
    if (vnode.type === Fragment) {
        const fragment = document.createDocumentFragment();
        const children = Array.isArray(vnode.children) ? vnode.children : [];
        children.forEach((child) => {
            if (isPrimitive(child)) {
                if (child != null) {
                    fragment.appendChild(document.createTextNode(String(child)));
                }
            }
            else if (isVNode(child)) {
                const childEl = createDOMElement(child);
                if (childEl)
                    fragment.appendChild(childEl);
            }
        });
        return fragment;
    }
    // Handle DOM elements
    if (typeof vnode.type === "string") {
        const el = document.createElement(vnode.type);
        const { style, class: classNames, className, ref, ...rest } = vnode.props;
        // Apply styles
        if (style)
            applyStyles(el, style);
        // Apply classes
        if (classNames)
            applyClasses(el, classNames);
        if (className)
            applyClasses(el, className);
        // Apply other props and event handlers
        Object.entries(rest).forEach(([key, value]) => {
            if (key.startsWith("on") && typeof value === "function") {
                const eventName = key.slice(2).toLowerCase();
                el.addEventListener(eventName, value);
            }
            else if (value != null && value !== false) {
                el.setAttribute(key, String(value));
            }
        });
        // Handle children
        const children = Array.isArray(vnode.children) ? vnode.children : [];
        children.forEach((child) => {
            if (isPrimitive(child)) {
                if (child != null) {
                    el.appendChild(document.createTextNode(String(child)));
                }
            }
            else if (isVNode(child)) {
                const childEl = createDOMElement(child);
                if (childEl)
                    el.appendChild(childEl);
            }
        });
        // Handle ref
        if (ref)
            setRef(ref, el);
        return el;
    }
    return null;
}
//# sourceMappingURL=core.js.map