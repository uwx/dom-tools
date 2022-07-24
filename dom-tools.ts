// ------------
//
// [DOMTools] revision 3
// a fairly optimized DOM manipulation library. vaguely inspired by jQuery syntax. performance is a main focus.
//
// ------------
//
// Partially based on Daniel Eager's jQuery Lite
//   https://github.com/deager/jquery-lite
//
// Using some code from jQuery under the following license:
//   Copyright JS Foundation and other contributors, https://js.foundation/
//
//   Permission is hereby granted, free of charge, to any person obtaining
//   a copy of this software and associated documentation files (the
//   "Software"), to deal in the Software without restriction, including
//   without limitation the rights to use, copy, modify, merge, publish,
//   distribute, sublicense, and/or sell copies of the Software, and to
//   permit persons to whom the Software is furnished to do so, subject to
//   the following conditions:
//
//   The above copyright notice and this permission notice shall be
//   included in all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
//   LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
//   WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

export type ElementList<T extends Element> = NodeListOf<T> | HTMLCollectionOf<T> | T[];
export type ElementListWithElement<T extends Element> = { 0: T } & ElementList<T>;

type KeysOfType<T, T1> = {
    [P in keyof T]: T[P] extends T1 ? P : never;
}[keyof T];

type ElementsInBrackets<T> = {
    [P in keyof T & string as `<${P}>`]: T[P];
}

let _pageLoaded = false;
let _eventQueue: Array<() => void> | null = null;

function crashOrDefault<T>(def: T | (new () => T), message = 'No elements in DOMTools node'): T {
    if ($d.useStrict) {
        throw new Error(message);
    }
    if (typeof def === 'function') {
        return new (def as new () => T)();
    }
    return def as T;
}

function crashOrWarn(message: string, ...extraArgs: any[]): void {
    if ($d.useStrict) {
        throw new Error(message + ' ' + extraArgs.join(' '));
    }
    console.warn(message, ...extraArgs);
}

// https://stackoverflow.com/a/25352300
function isValidCssIdentifierOffsetBy1(str: string): boolean {
    let code = str.charCodeAt(1);
    if ((code <= 64 || code >= 91) && // upper alpha (A-Z)
        (code <= 96 || code >= 123)) { // lower alpha (a-z)
        return false;
    }

    for (let i = 2, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if ((code <= 47 || code >= 58) && // numeric (0-9)
            (code <= 64 || code >= 91) && // upper alpha (A-Z)
            (code <= 96 || code >= 123) && // lower alpha (a-z)
            str[i] !== '_' &&
            str[i] !== '-') {
            return false;
        }
    }

    return true;
}

function isValidHtmlIdentifier(str: string, start = 0, end = str.length): boolean {
    let code: number;
    for (let i = start; i < end; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123) && // lower alpha (a-z)
            str[i] !== '_' &&
            str[i] !== '-') {
            return false;
        }
    }
    return true;
}

/**
 * Creates a DOMNode from a CSS selector, fast-tracking where possible, with the selector root being a parameter
 * @param selector the selector
 * @param root the selector root
 * @param alwaysQuerySelector set to true to simply do querySelectorAll
 * @param rootIsDocument set to true when root === window.document, allows fast-track #id and [name], and create element via <tag>
 */
export function $element<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export function $element<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export function $element<T extends HTMLElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export function $element<T extends SVGElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK, root: Element | Document, alwaysQuerySelector?: false, rootIsDocument?: boolean): BaseContainer<TK>;
export function $element<E extends Element = Element>(selector: string, root: Element | Document, alwaysQuerySelector?: boolean, rootIsDocument?: boolean): BaseContainer<E>;
export function $element(selector: string, root: Element | Document, alwaysQuerySelector?: boolean, rootIsDocument?: boolean): BaseContainer<Element> {
    // querySelectorAll returns static elements, so it's an option here
    if (alwaysQuerySelector) {
        return new ElementListContainer(root.querySelectorAll(selector));
    }

    switch (selector[0]) {
        case '.': // fast-track .class
            if (isValidCssIdentifierOffsetBy1(selector)) {
                return new ElementListContainer(root.getElementsByClassName(selector.slice(1)));
            }
            break;
        case '#': // fast-track #id
            if (rootIsDocument && isValidCssIdentifierOffsetBy1(selector)) {
                const foundElement = document.getElementById(selector.slice(1));
                return foundElement !== null ? new ElementContainer(foundElement) : crashOrDefault(EmptyContainer.instance, 'No match for ' + selector);
            }
            break;
        case '[': // fast-track [name="foobar"]
            if (rootIsDocument && selector.startsWith('[name=') && selector[selector.length - 1] === ']') {
                const sliced = selector['[name='.length] === '"'
                    ? selector.slice('[name="'.length, -'"]'.length)
                    : selector.slice('[name='.length, -']'.length);

                if (isValidHtmlIdentifier(sliced)) {
                    return new ElementListContainer(document.getElementsByName(sliced));
                }
            }
            break;
        case '<': // create element via <tagname>
            if (rootIsDocument && selector[selector.length - 1] === '>' && isValidHtmlIdentifier(selector, 1, selector.length - 1)) {
                return new ElementContainer(document.createElement(selector.slice(1, -1)));
            }
            break;
        default: // fast-track tagname
            if (isValidHtmlIdentifier(selector)) {
                return new ElementListContainer(root.getElementsByTagName(selector));
            }
            break;
    }

    // allowQuerySelector is an option so you can avoid creating static element lists when you want live ones
    if ($d.allowQuerySelector) {
        return new ElementListContainer(root.querySelectorAll(selector));
    }

    return crashOrDefault(EmptyContainer.instance, 'Argument must be a CSS selector or <tag>, was ' + selector);
}

/**
 * Delays a function's execution to when the DOM loads, but before all images and media are loaded
 * @param func the function to execute
 */
export function $onLoad(func: () => void): void {
    if (_pageLoaded) {
        func();
        return;
    }

    if (_eventQueue === null) {
        _eventQueue = [];
        document.addEventListener('DOMContentLoaded', () => {
            _pageLoaded = true;
            for (const fn of _eventQueue!) fn();
            _eventQueue = null;
        }, { capture: false, once: true, passive: true });
    }

    _eventQueue.push(func);
}

/**
 * Creates a DOMNode wrapping around an existing element-like object
 * @param obj the object to wrap around
 */
export function $wrap<T extends Element>(obj: T): ElementContainer<T>;
export function $wrap<T extends Element>(obj: ElementList<T>): ElementListContainer<T>;
export function $wrap<T extends BaseContainer<E>, E extends Element>(obj: T): T; // returns itself
export function $wrap(obj: Document): EventTargetContainer<Document, HTMLElement>; // wrap document
export function $wrap(obj: Window): EventTargetContainer<Window, HTMLElement>; // wrap window
export function $wrap<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T>;
export function $wrap<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T> | EventTargetContainer<Document | Window, HTMLElement> {
    if (obj instanceof Element) {
        return new ElementContainer(obj);
    }

    if (obj instanceof Window) {
        return new EventTargetContainer(window, document?.documentElement ?? crashOrDefault(null, 'Document element not available yet'));
    }

    if (obj instanceof Document) {
        return new EventTargetContainer(document, document.documentElement);
    }

    if (obj instanceof BaseContainer) {
        return obj;
    }

    if (obj instanceof NodeList || obj instanceof HTMLCollection || Array.isArray(obj)) {
        return new ElementListContainer<T>(obj);
    }

    // TODO generic documents/windows?

    return crashOrDefault<EmptyContainer<T>>(EmptyContainer.instance as EmptyContainer<T>, 'Unknown object type ' + (obj as any).prototype);
}

/**
 * The main DomTools function. it's basically like jQuery!
 * @param arg the argument - a selector, a function to execute on DOM load, or an object to wrap into a DOMNode
 */
// $element
export function $d<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
export function $d<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
export function $d<T extends HTMLElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
export function $d<T extends SVGElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
export function $d<E extends Element = Element>(selector: string): BaseContainer<E>;

// $onLoad
export function $d(arg: (() => void)): void; // on load

// $wrap
export function $d<T extends Element>(obj: T): ElementContainer<T>;
export function $d<T extends Element>(obj: ElementList<T>): ElementListContainer<T>;
export function $d<T extends BaseContainer<E>, E extends Element>(obj: T): T; // returns itself
export function $d(obj: Document): EventTargetContainer<Document, HTMLElement>; // wrap document
export function $d(obj: Window): EventTargetContainer<Window, HTMLElement>; // wrap window
export function $d<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T>;

// all-in-one
export function $d<E extends Element = Element>(arg: E | ElementList<E> | Window | Document | BaseContainer<E> | string | (() => void)): void | BaseContainer<E>;
export function $d<E extends Element = Element>(arg: E | ElementList<E> | Window | Document | BaseContainer<E> | string | (() => void)): void | BaseContainer<E> {
    switch (typeof arg) {
        case 'string':
            return $element(arg, document, /*alwaysQuerySelector*/ false, /*rootIsDocument*/ true);
        case 'function':
            return $onLoad(arg);
        case 'object':
            return $wrap(arg);
    }
}

export namespace $d {
    /**
     * Calls DomTools but throws if the returned value is empty. This is a direct opposited to jQuery which never throws.
     * @param arg the argument - a selector, a function to execute on DOM load, or an object to wrap into a DOMNode
     */
    // $element
    export function strict<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
    export function strict<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T, TK extends T[K] & Element>(selector: T): BaseContainer<TK>;
    export function strict<T extends HTMLElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
    export function strict<T extends SVGElementTagNameMap, K extends keyof T, TK extends T[K] & Element>(selector: TK): BaseContainer<TK>;
    export function strict<E extends Element = Element>(selector: string): BaseContainer<E>;

    // $onLoad
    export function strict(arg: (() => void)): void; // on load

    // $wrap
    export function strict<T extends Element>(obj: T): ElementContainer<T>;
    export function strict<T extends Element>(obj: ElementList<T>): ElementListContainer<T>;
    export function strict<T extends BaseContainer<E>, E extends Element>(obj: T): T; // returns itself
    export function strict(obj: Document): EventTargetContainer<Document, HTMLElement>; // wrap document
    export function strict(obj: Window): EventTargetContainer<Window, HTMLElement>; // wrap window
    export function strict<T extends Element>(obj: T | ElementList<T> | BaseContainer<T> | Window | Document): BaseContainer<T>;

    // all-in-one
    export function strict<E extends Element = Element>(arg: E | ElementList<E> | Window | Document | BaseContainer<E> | string | (() => void)): void | BaseContainer<E> {
        const originalUseStrict = $d.useStrict;
        $d.useStrict = true;
        try {
            const result = $d(arg);
            if (result && !result.element) throw new Error(`$d call for "${arg}" returned empty`);
            return result;
        } finally {
            $d.useStrict = originalUseStrict;
        }
    }

    /** set to true to fallback to querySelector without passing alwaysQuerySelector=true */
    export let allowQuerySelector = true;

    /** set to true to throw instead of nooping when an error occurs */
    export let useStrict = false;

    /** set to true for verbose logging for debugging purposes */
    export let verbose = false;
}

const whitespaceRegex = /[^\x20\t\r\n\f]+/g;
export abstract class BaseContainer<TElement extends Element> {
    private originalDisplay?: string;

    /**
     * Returns an iterable containing the elements represented by this container. If there is only one element, returns
     * an array containing a single entry. If there are no elements, returns an empty array.
     */
    abstract get elements(): ElementList<TElement>;

    /**
     * Returns the first element represented by this container. If there is only one element, returns that element. If
     * there are no elements, returns null.
     */
    get element(): TElement | null {
        return this.elements[0]; // can be overriden if elements is not an array
    }

    /**
     * Get a given element at an index.
     */
    get(index: number): TElement | null {
        return this.elements[index]; // can be overriden if elements is not an array
    }

    /**
     * @returns Whether or not the current {@link BaseContainer} contains at least one element.
     */
    isEmpty(): this is { element: TElement } {
        return this.element !== null;
    }

    /**
     * Throws an error if this node contains no elements, and returns the current object otherwise. Methods that operate
     * on this.elements will never throw if the list is empty, so this is an option.
     */
    throwIfEmpty(): this & { element: TElement; elements: ElementListWithElement<TElement> } {
        if (!this.element) {
            throw new Error('No elements in DOMTools node');
        }
        return this as this & { element: TElement; elements: ElementListWithElement<TElement> };
    }

    /**
     * Utility for TypeScript - it is not yet possible (issue #34636) to have both an assertion and a return statement,
     * so throwIfEmpty and narrowNotEmpty let you choose which you want.
     */
    narrowNotEmpty(): asserts this is this & { element: TElement; elements: ElementListWithElement<TElement> } {
        this.throwIfEmpty();
    }

    /**
     * Gets the dataset of the first element in this container.
     */
    get data(): Record<string, string | undefined> {
        this.narrowNotEmpty();
        if (!('dataset' in this.element)) {
            throw new Error('Element is not capable of storing data');
        }
        return (this.element as HTMLOrSVGElement).dataset;
    }

    /**
     * Performs an operation on the first element's dataset.
     * @param operation The function to execute
     * @returns The current container
     */
    withData(operation: (dataset: Record<string, string | undefined>) => void): this {
        operation(this.data);
        return this;
    }

    /**
     * Sets the element's inner HTML to a provided string.
     * @param string The inner HTML to be set
     */
    html(string: string): this;
    /**
     * Gets the element's inner HTML.
     */
    html(): string;
    html(string?: string): this | string {
        if (string !== undefined) {
            for (const el of this.elements) {
                el.innerHTML = string;
            }
            return this;
        }

        return this.element?.innerHTML ?? crashOrDefault('');
    }

    /**
     * Deletes all contents of the elements in this container.
     * @returns The current container
     */
    empty(): this {
        return this.html('');
    }

    append(arg: string | Node | BaseContainer<Element> | Array<string | Node | BaseContainer<Element>>): this {
        if (!this.element) {
            return crashOrDefault(this);
        }

        if (typeof arg === 'string') {
            this.element.innerHTML += arg;
            return this;
        }

        if (Array.isArray(arg)) {
            for (const el of arg) {
                this.append(el);
            }
        } else if (arg instanceof BaseContainer) {
            for (const el of arg.elements) {
                this.element.append(el);
            }
        } else if (arg instanceof Node) {
            this.element.append(arg);
        } else {
            return crashOrDefault(this, 'Unsupported argument type, must be Node or DOMTools node or array thereof');
        }

        return this;
    }

    appendToAll(arg: string | Node | BaseContainer<Element> | Array<string | Node | BaseContainer<Element>>): this {
        if (typeof arg === 'string') {
            for (const el of this.elements) {
                el.innerHTML += arg;
            }
            return this;
        }

        if (!this.element) {
            return crashOrDefault(this);
        }

        if (Array.isArray(arg)) {
            for (const el of arg) {
                this.appendToAll(el);
            }
        } else if (arg instanceof BaseContainer) {
            for (const ownEl of this.elements) {
                for (const el of arg.elements) {
                    ownEl.append(el.cloneNode(true));
                }
            }
        } else if (arg instanceof Node) {
            for (const el of this.elements) {
                el.append(arg.cloneNode(true));
            }
        } else {
            return crashOrDefault(this, 'Unsupported argument type, must be element or DOMTools node or array thereof');
        }

        return this;
    }

    appendText(text: string): this {
        for (const el of this.elements) {
            el.append(text);
        }
        return this;
    }

    attr(name: string): string;
    attr(name: string, value: string): this;
    attr(name: string, value?: string): this | string {
        if (value !== undefined) {
            for (const el of this.elements) {
                el.setAttribute(name, value);
            }
            return this;
        }

        return this.element?.getAttribute(name) ?? crashOrDefault('');
    }

    // supports comma-separated OR space-separated classes, not both at the same time
    addClass(class1: string, ...otherClasses: string[]): this {
        if (otherClasses.length !== 0) {
            for (const el of this.elements) {
                el.classList.add(class1, ...otherClasses);
            }
        } else {
            const results = class1.match(whitespaceRegex);
            if (results === null) { // No match, for any reason
                for (const el of this.elements) {
                    el.classList.add(class1);
                }
            } else {
                for (const el of this.elements) {
                    el.classList.add(...results);
                }
            }
        }
        return this;
    }

    // TODO support same as above
    removeClass(dropClass: string): this {
        for (const el of this.elements) {
            el.classList.remove(dropClass);
        }
        return this;
    }

    toggleClass(toggleClass: string): this {
        for (const el of this.elements) {
            el.classList.toggle(toggleClass);
        }
        return this;
    }

    children(): ElementListContainer<Element> {
        const allChildren: Element[] = [];

        for (const el of this.elements) {
            allChildren.push(...(el.children as unknown as Iterable<Element>));
        }

        return new ElementListContainer(allChildren);
    }

    parent(): BaseContainer<Element> {
        const parents = new Set<HTMLElement>();

        for (const el of this.elements) {
            if (el.parentElement !== null) {
                parents.add(el.parentElement);
            }
        }

        return new ElementListContainer([...parents]);
    }

    find<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends HTMLElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<T extends SVGElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<E extends Element = Element>(selector: string, alwaysQuerySelector?: boolean): BaseContainer<E>;
    find<E extends Element = Element>(selector: string, alwaysQuerySelector?: boolean): BaseContainer<E> {
        const matchingElements = new Set<E>();

        for (const el of this.elements) {
            for (const match of $element<E>(selector, el, alwaysQuerySelector).elements) {
                matchingElements.add(match);
            }
        }

        return new ElementListContainer([...matchingElements]);
    }

    remove(): this {
        for (const el of this.elements) {
            el.remove();
        }
        return this; // returns detached elements
    }

    on<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
        for (const el of this.elements) {
            el.addEventListener(type, listener, options);
        }
        return this;
    }

    once<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, useCapture?: boolean): this;
    once(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): this;
    once(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): this {
        for (const el of this.elements) {
            el.addEventListener(type, listener, { capture: useCapture, once: true });
        }
        return this;
    }

    off<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | EventListenerOptions): this;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this {
        for (const el of this.elements) {
            el.removeEventListener(type, listener, options);
        }
        return this;
    }

    // foreach, without creating any sort of DOMNode(s)
    each(callback: (el: Element, index: number, elements: ElementList<TElement>) => void): this {
        const elements = this.elements;
        for (let i = 0, len = elements.length; i < len; i++) {
            callback(elements[i], i, elements);
        }
        return this;
    }

    // map, without creating any sort of DOMNode(s)
    map<T>(callback: (el: Element, index: number, elements: ElementList<TElement>) => T): T[] {
        const elements = this.elements;
        const arr = new Array(elements.length);
        for (let i = 0, len = elements.length; i < len; i++) {
            arr[i] = callback(elements[i], i, elements);
        }
        return arr;
    }

    $each(callback: (el: BaseContainer<TElement>, index: number, elements: ElementList<TElement>) => void): this {
        const elements = this.elements;
        for (let i = 0, len = elements.length; i < len; i++) {
            callback(new ElementContainer<TElement>(elements[i]), i, elements);
        }
        return this;
    }

    $map(callback: (el: BaseContainer<TElement>, index: number, elements: ElementList<TElement>) => BaseContainer<Element> | Element): BaseContainer<Element> {
        const elements = this.elements;
        const arr = new Array(elements.length);
        for (let i = 0, len = elements.length; i < len; i++) {
            let newElement = callback(new ElementContainer(elements[i]), i, elements);
            if (!(newElement instanceof BaseContainer)) {
                newElement = new ElementContainer(newElement);
            }
            arr[i] = newElement;
        }
        return new ElementListContainer(arr);
    }

    // POSSIBLE ISSUE: only stores display for the first matched element
    hide() {
        if (this.isEmpty()) return;
        this.originalDisplay = this.css('display');
        this.css('display', 'none');
        return this;
    }

    show() {
        if (this.isEmpty()) return;
        this.css('display', this.originalDisplay || '');
        delete this.originalDisplay;
        return this;
    }

    css(property: keyof CSSStyleDeclaration & string): string;
    css(property: keyof CSSStyleDeclaration & string, value: string): this;
    css(property: keyof CSSStyleDeclaration & string, value?: string): this | string {
        if (value === undefined) {
            return this.element ? (this.element as unknown as HTMLElement).style.getPropertyValue(property) : crashOrDefault('');
        }

        for (const el of this.elements) {
            ((el as unknown as HTMLElement).style as any)[property] = value;
        }
        return this;
    }

    clearChildren(): this {
        for (const el of this.elements) {
            let firstChild: ChildNode | null;
            while (firstChild = el.firstChild) firstChild.remove();
        }
        return this;
    }

    text(): string;
    text(string: string): this;
    text(string?: string): this | string {
        if (string !== undefined) {
            for (const el of this.elements) {
                let firstChild;
                while (firstChild = el.firstChild) firstChild.remove();

                el.appendChild(document.createTextNode(string));
            }
            return this;
        }

        const text = [];
        for (const el of this.elements) {
            text.push((el as unknown as HTMLElement).innerText); // only visible text
        }
        return text.join('');
    }

    val(): string;
    val(value: string): this;
    val(value?: string): this | string {
        if (value !== undefined) {
            for (const el of this.elements) {
                (el as unknown as HTMLInputElement).value = value;
            }
            return this;
        }

        return (this.element as unknown as HTMLInputElement)?.value ?? crashOrDefault(undefined);
    }

    checked(): boolean;
    checked(value: boolean): this;
    checked(value?: boolean): this | boolean {
        if (value !== undefined) {
            for (const el of this.elements) {
                (el as unknown as HTMLInputElement).checked = (el as unknown as HTMLInputElement).checked !== undefined ? value : crashOrDefault(value, 'Element is not a checkbox');
            }
            return this;
        }

        return (this.element as unknown as HTMLInputElement)?.checked ?? crashOrDefault(undefined, 'Element is not a checkbox');
    }

    private _eventFunction(name: string, callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) {
        return this.on(name, callback, useCapture);
    }

    private _dualEventFunction(name: KeysOfType<Element, () => void>): this;
    private _dualEventFunction(name: string, callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    private _dualEventFunction(name: string | KeysOfType<Element, () => void>, callback?: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    private _dualEventFunction(name: string | KeysOfType<Element, () => void>, callback?: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this {
        if (callback) {
            return this.on(name, callback, useCapture);
        }

        for (const el of this.elements) {
            el[name as KeysOfType<Element, () => void>]();
        }
        return this;
    }

    click(): this;
    click(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    click(callback?: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._dualEventFunction('click', callback, useCapture); }

    blur(): this;
    blur(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    blur(callback?: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._dualEventFunction('blur', callback, useCapture); }

    focus(): this;
    focus(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions): this;
    focus(callback?: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._dualEventFunction('focus', callback, useCapture); }

    keypress(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('keypress', callback, useCapture); }
    submit(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('submit', callback, useCapture); }
    load(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('load', callback, useCapture); }
    dblclick(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('dblclick', callback, useCapture); }
    keydown(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('keydown', callback, useCapture); }
    change(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('change', callback, useCapture); }
    resize(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('resize', callback, useCapture); }
    mouseenter(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('mouseenter', callback, useCapture); }
    keyup(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('keyup', callback, useCapture); }
    scroll(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('scroll', callback, useCapture); }
    mouseleave(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('mouseleave', callback, useCapture); }
    unload(callback: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) { return this._eventFunction('unload', callback, useCapture); }
}

class EmptyContainer<TElement extends Element> extends BaseContainer<TElement> {
    static readonly instance: EmptyContainer<Element> = new EmptyContainer();

    private static readonly emptyArray: ElementList<any> = [];

    private constructor() {
        super();
    }

    get elements() {
        return EmptyContainer.emptyArray;
    }
    get element() {
        return null;
    }
}

class ElementContainer<TElement extends Element> extends BaseContainer<TElement> {
    private _elements: TElement[];

    constructor(element: TElement) {
        super();
        this._elements = [element];
    }

    get element(): TElement {
        return this._elements[0];
    }

    get elements() {
        return this._elements;
    }

    // less memory-intensive implementations...
    children(): ElementListContainer<Element> {
        return new ElementListContainer(this.element.children);
    }

    parent(): ElementContainer<Element> | EmptyContainer<Element> {
        return this.element.parentElement !== null ? new ElementContainer(this.element.parentElement) : crashOrDefault(EmptyContainer.instance, 'Element lacks a parent');;
    }

    find<T extends ElementsInBrackets<HTMLElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends ElementsInBrackets<SVGElementTagNameMap>, K extends keyof T>(selector: T, alwaysQuerySelector?: boolean): T[K];
    find<T extends HTMLElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<T extends SVGElementTagNameMap, K extends keyof T>(selector: K, alwaysQuerySelector?: boolean): T[K] | null;
    find<E extends Element = Element>(selector: string, alwaysQuerySelector?: boolean): BaseContainer<E>;
    find<E extends Element = Element>(selector: string, alwaysQuerySelector?: boolean): BaseContainer<E> {
        return $element(selector, this.element, alwaysQuerySelector);
    }

    each(callback: (el: Element, index: number, elements: TElement[]) => void): this {
        callback(this.element, 0, this.elements);
        return this;
    }

    map<T>(callback: (el: Element, index: number, elements: TElement[]) => T): T[] {
        return [callback(this.element, 0, this.elements)];
    }

    $each(callback: (el: BaseContainer<TElement>, index: number, elements: TElement[]) => void): this {
        callback(new ElementContainer(this.element), 0, this.elements);
        return this;
    }

    $map(callback: (el: this, index: number, elements: TElement[]) => ElementContainer<Element> | Element): ElementContainer<Element> {
        let newElement = callback(this, 0, this.elements);
        if (!(newElement instanceof BaseContainer)) {
            newElement = new ElementContainer<Element>(newElement);
        }
        return newElement;
    }
}

export class ElementListContainer<TElement extends Element> extends BaseContainer<TElement> {
    private _elements: ElementList<TElement>;

    // elements: NodeList, Array, anything with a length property and indexer, except DOMNodeCollection, or array of DOMBaseNode
    constructor(elements: ElementList<TElement>) {
        super();
        this._elements = elements;
    }
    get elements() {
        return this._elements;
    }
}

// special case- a DOMNode that isn't really a DOMNode, just an EventTarget with a node representation elsewhere
export class EventTargetContainer<TEventTarget extends EventTarget, TElement extends Element> extends ElementContainer<TElement> {
    private _eventTarget: TEventTarget;

    constructor(eventTarget: TEventTarget, element: TElement) {
        super(element);
        this._eventTarget = eventTarget;
    }

    on<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
        this._eventTarget.addEventListener(type, listener, options);
        return this;
    }

    once<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, useCapture?: boolean): this;
    once(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): this;
    once(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): this {
        this._eventTarget.addEventListener(type, listener, { capture: useCapture, once: true });
        return this;
    }

    off<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | EventListenerOptions): this;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): this {
        this._eventTarget.removeEventListener(type, listener, options);
        return this;
    }
}

export default $d;
export const $window = $d.strict(window);
export const $document = $d.strict(document);
