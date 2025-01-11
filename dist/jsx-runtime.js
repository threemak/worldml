// src/jsx-runtime.ts
import { Fragment } from "./types";
import { createElement } from "./core";
export function jsx(type, props, key) {
    return createElement(type, { ...props, key });
}
export function jsxs(type, props, key) {
    return createElement(type, { ...props, key });
}
export function jsxDEV(type, props, key) {
    return createElement(type, { ...props, key });
}
export { Fragment };
//# sourceMappingURL=jsx-runtime.js.map