export declare type ElementList<T extends Element> = NodeListOf<T> | HTMLCollectionOf<T> | T[];
export declare type ElementListWithElement<T extends Element> = {
    0: T;
} & ElementList<T>;
declare type ElementsInBrackets<T> = {
    [P in keyof T & string as `<${P}>`]: T[P];
};
/**
 * Creates a DOMNode from a CSS selector, fast-tracking where possible, with the selector root being a parameter
 * @param selector the selector
 * @param root the selector root
 * @param alwaysQuerySelector set to true to simply do querySelectorAll
 * @param rootIsDocument set to true when root === window.document, allows fast-track #id and [name], and create element via <tag>
 */
export declare function $element<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export declare function $element<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export declare function $element<T extends HTMLElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export declare function $element<T extends SVGElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export declare function $element<E extends Element = Element>(selector: string, root: Element | Document, alwaysQuerySelector?: boolean, rootIsDocument?: boolean): BaseContainer<E>;
/**
 * Delays a function's execution to when the DOM loads, but before all images and media are loaded
 * @param func the function to execute
 */
export declare function $onLoad(func: () => void): void;
/**
 * Creates a DOMNode wrapping around an existing element-like object
 * @param obj the object to wrap around
 */
export declare function $wrap<T extends Element>(obj: T): ElementContainer<T>;
export declare function $wrap<T extends Element>(obj: ElementList<T>): ElementListContainer<T>;
export declare function $wrap<T extends BaseContainer<E>, E extends Element>(obj: T): T;
export declare function $wrap(obj: Document): EventTargetContainer<Document, HTMLElement>;
export declare function $wrap(obj: Window): EventTargetContainer<Window, HTMLElement>;
export declare function $wrap<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T>;
/**
 * The main DomTools function. it's basically like jQuery!
 * @param arg the argument - a selector, a function to execute on DOM load, or an object to wrap into a DOMNode
 */
export declare function $d<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
export declare function $d<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
export declare function $d<T extends HTMLElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
export declare function $d<T extends SVGElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
export declare function $d<E extends Element = Element>(selector: string): BaseContainer<E>;
export declare function $d(arg: (() => void)): void;
export declare function $d<T extends Element>(obj: T): ElementContainer<T>;
export declare function $d<T extends Element>(obj: ElementList<T>): ElementListContainer<T>;
export declare function $d<T extends BaseContainer<E>, E extends Element>(obj: T): T;
export declare function $d(obj: Document): EventTargetContainer<Document, HTMLElement>;
export declare function $d(obj: Window): EventTargetContainer<Window, HTMLElement>;
export declare function $d<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T>;
export declare function $d<E extends Element = Element>(arg: E | ElementList<E> | Window | Document | BaseContainer<E> | string | (() => void)): void | BaseContainer<E>;
export declare namespace $d {
    /**
     * Calls DomTools but throws if the returned value is empty. This is a direct opposited to jQuery which never throws.
     * @param arg the argument - a selector, a function to execute on DOM load, or an object to wrap into a DOMNode
     */
    function strict<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
    function strict<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
    function strict<T extends HTMLElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
    function strict<T extends SVGElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
    function strict<E extends Element = Element>(selector: string): BaseContainer<E>;
    function strict(arg: (() => void)): void;
    function strict<T extends Element>(obj: T): ElementContainer<T>;
    function strict<T extends Element>(obj: ElementList<T>): ElementListContainer<T>;
    function strict<T extends BaseContainer<E>, E extends Element>(obj: T): T;
    function strict(obj: Document): EventTargetContainer<Document, HTMLElement>;
    function strict(obj: Window): EventTargetContainer<Window, HTMLElement>;
    function strict<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T>;
    /** set to true to fallback to querySelector without passing alwaysQuerySelector=true */
    let allowQuerySelector: boolean;
    /** set to true to throw instead of nooping when an error occurs */
    let useStrict: boolean;
    /** set to true for verbose logging for debugging purposes */
    let verbose: boolean;
}
export declare abstract class BaseContainer<TElement extends Element> {
    private originalDisplay?;
    /**
     * Returns an iterable containing the elements represented by this container. If there is only one element, returns
     * an array containing a single entry. If there are no elements, returns an empty array.
     */
    abstract get elements(): ElementList<TElement>;
    /**
     * Returns the first element represented by this container. If there is only one element, returns that element. If
     * there are no elements, returns null.
     */
    get element(): TElement | null;
    /**
     * Get a given element at an index.
     */
    get(index: number): TElement | null;
    /**
     * @returns Whether or not the current {@link BaseContainer} contains at least one element.
     */
    isEmpty(): this is {
        element: TElement;
    };
    /**
     * Throws an error if this node contains no elements, and returns the current object otherwise. Methods that operate
     * on this.elements will never throw if the list is empty, so this is an option.
     */
    throwIfEmpty(): this & {
        element: TElement;
        elements: ElementListWithElement<TElement>;
    };
    /**
     * Utility for TypeScript - it is not yet possible (issue #34636) to have both an assertion and a return statement,
     * so throwIfEmpty and narrowNotEmpty let you choose which you want.
     */
    narrowNotEmpty(): asserts this is this & {
        element: TElement;
        elements: ElementListWithElement<TElement>;
    };
    /**
     * Gets the dataset of the first element in this container.
     */
    get data(): Record<string, string | undefined>;
    /**
     * Performs an operation on the first element's dataset.
     * @param operation The function to execute
     * @returns The current container
     */
    withData(operation: (dataset: Record<string, string | undefined>) => void): this;
    /**
     * Sets the element's inner HTML to a provided string.
     * @param string The inner HTML to be set
     */
    html(string: string): this;
    /**
     * Gets the element's inner HTML.
     */
    html(): string;
    /**
     * Deletes all contents of the elements in this container.
     * @returns The current container
     */
    empty(): this;
    append(arg: string | Node | BaseContainer<Element> | Array<string | Node | BaseContainer<Element>>): this;
    appendToAll(arg: string | Node | BaseContainer<Element> | Array<string | Node | BaseContainer<Element>>): this;
    appendText(text: string): this;
    attr(name: string): string;
    attr(name: string, value: string): this;
    addClass(class1: string, ...otherClasses: string[]): this;
    removeClass(dropClass: string): this;
    toggleClass(toggleClass: string): this;
    children(): ElementListContainer<Element>;
    parent(): BaseContainer<Element>;
    find<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends HTMLElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<T extends SVGElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<E extends Element = Element>(selector: string, alwaysQuerySelector?: boolean): BaseContainer<E>;
    remove(): this;
    on<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
    once<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, useCapture?: boolean): this;
    once(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): this;
    off<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | EventListenerOptions): this;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
    each(callback: (el: Element, index: number, elements: ElementList<TElement>) => void): this;
    map<T>(callback: (el: Element, index: number, elements: ElementList<TElement>) => T): T[];
    $each(callback: (el: BaseContainer<TElement>, index: number, elements: ElementList<TElement>) => void): this;
    $map(callback: (el: BaseContainer<TElement>, index: number, elements: ElementList<TElement>) => BaseContainer<Element> | Element): BaseContainer<Element>;
    hide(): this | undefined;
    show(): this | undefined;
    css(property: keyof CSSStyleDeclaration & string): string;
    css(property: keyof CSSStyleDeclaration & string, value: string): this;
    clearChildren(): this;
    text(): string;
    text(string: string): this;
    val(): string;
    val(value: string): this;
    checked(): boolean;
    checked(value: boolean): this;
    private _eventFunction;
    private _dualEventFunction;
    click(): this;
    click(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    blur(): this;
    blur(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    focus(): this;
    focus(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    keypress(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    submit(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    load(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    dblclick(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    keydown(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    change(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    resize(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    mouseenter(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    keyup(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    scroll(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    mouseleave(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    unload(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
}
declare class EmptyContainer<TElement extends Element> extends BaseContainer<TElement> {
    static readonly instance: EmptyContainer<Element>;
    private static readonly emptyArray;
    private constructor();
    get elements(): ElementList<any>;
    get element(): null;
}
declare class ElementContainer<TElement extends Element> extends BaseContainer<TElement> {
    private _elements;
    constructor(element: TElement);
    get element(): TElement;
    get elements(): TElement[];
    children(): ElementListContainer<Element>;
    parent(): ElementContainer<Element> | EmptyContainer<Element>;
    find<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends HTMLElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<T extends SVGElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<E extends Element = Element>(selector: string, alwaysQuerySelector?: boolean): BaseContainer<E>;
    each(callback: (el: Element, index: number, elements: TElement[]) => void): this;
    map<T>(callback: (el: Element, index: number, elements: TElement[]) => T): T[];
    $each(callback: (el: BaseContainer<TElement>, index: number, elements: TElement[]) => void): this;
    $map(callback: (el: this, index: number, elements: TElement[]) => ElementContainer<Element> | Element): ElementContainer<Element>;
}
export declare class ElementListContainer<TElement extends Element> extends BaseContainer<TElement> {
    private _elements;
    constructor(elements: ElementList<TElement>);
    get elements(): ElementList<TElement>;
}
export declare class EventTargetContainer<TEventTarget extends EventTarget, TElement extends Element> extends ElementContainer<TElement> {
    private _eventTarget;
    constructor(eventTarget: TEventTarget, element: TElement);
    on<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
    once<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, useCapture?: boolean): this;
    once(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): this;
    off<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | EventListenerOptions): this;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
}
export default $d;
export declare const $window: EventTargetContainer<Window, HTMLElement>;
export declare const $document: EventTargetContainer<Document, HTMLElement>;
