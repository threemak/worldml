import { VNode, VNodeProps, VNodeChild, VNodeTypes } from "./types";
export declare function createElement(type: VNodeTypes, props: VNodeProps | null, ...children: VNodeChild[]): VNode;
export declare function render(vnode: VNode, container: HTMLElement): Node | null;
