import { VNode, VNodeChild, VNodeProps } from "../types";
declare global {
    namespace JSX {
        interface ElementChildrenAttribute {
            children: {};
        }
        interface IntrinsicAttributes {
            key?: string | number;
        }
        interface IntrinsicElements {
            [elemName: string]: string | VNodeProps;
        }
        interface Element extends VNode {
            children: string | VNodeChild | VNodeChild[];
        }
    }
}
export {};
