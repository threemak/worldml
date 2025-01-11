export declare const Fragment: unique symbol;
export type DOMEventHandler<K extends keyof HTMLElementEventMap> = (event: HTMLElementEventMap[K]) => void;
export type StyleValue = string | Partial<CSSStyleDeclaration> | null;
export type ClassValue = string | Record<string, boolean> | (string | Record<string, boolean>)[] | null;
export type RefCallback<T> = (el: T | null) => void;
export type RefObject<T> = {
    value: T | null;
};
export type Ref<T = any> = RefCallback<T> | RefObject<T> | string;
export type EmitsOptions = Record<string, ((...args: any[]) => any) | null>;
export interface ComponentContext<E extends EmitsOptions = {}> {
    emit: E extends Record<infer K, any> ? (event: K, ...args: any[]) => void : (event: string, ...args: any[]) => void;
}
export type EventHandlers = {
    [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: DOMEventHandler<K>;
};
export type VNodeTypes = keyof HTMLElementTagNameMap | FunctionComponent | typeof Fragment;
export type Primitive = string | number | boolean | null | undefined;
export type VNodeChild = VNode | Primitive | FunctionComponent | VNodeChild[] | typeof Fragment;
export interface VNodeProps extends EventHandlers, Record<string, unknown> {
    className?: string;
    style?: StyleValue;
    class?: ClassValue;
    key?: string | number;
    ref?: Ref;
    children?: VNodeChild | VNodeChild[];
}
export interface VNode<P extends VNodeProps = VNodeProps> {
    type: VNodeTypes;
    props: P;
    children: VNodeChild | VNodeChild[];
    el?: Node | null;
    key?: string | number | null | undefined;
}
export type FunctionComponent<P extends VNodeProps = VNodeProps, E extends EmitsOptions = {}> = (props: P, context: ComponentContext<E>) => VNode | null | undefined;
