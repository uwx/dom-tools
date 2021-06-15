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
let _pageLoaded = false;
let _eventQueue = null;
function crashOrDefault(def, message = 'No elements in DOMTools node') {
    if ($d.useStrict) {
        throw new Error(message);
    }
    if (typeof def === 'function') {
        return new def();
    }
    return def;
}
function crashOrWarn(message, ...extraArgs) {
    if ($d.useStrict) {
        throw new Error(message + ' ' + extraArgs.join(' '));
    }
    console.warn(message, ...extraArgs);
}
// https://stackoverflow.com/a/25352300
function isValidCssIdentifierOffsetBy1(str) {
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
function isValidHtmlIdentifier(str, start = 0, end = str.length) {
    let code;
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
export function $element(selector, root, alwaysQuerySelector, rootIsDocument) {
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
                return foundElement !== null ? new ElementContainer(foundElement) : crashOrDefault(EmptyContainer, 'No match for ' + selector);
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
    return crashOrDefault(EmptyContainer, 'Argument must be a CSS selector or <tag>, was ' + selector);
}
/**
 * Delays a function's execution to when the DOM loads, but before all images and media are loaded
 * @param func the function to execute
 */
export function $onLoad(func) {
    if (_pageLoaded) {
        func();
        return;
    }
    if (_eventQueue === null) {
        _eventQueue = [];
        document.addEventListener('DOMContentLoaded', () => {
            _pageLoaded = true;
            for (const fn of _eventQueue)
                fn();
            _eventQueue = null;
        }, { capture: false, once: true, passive: true });
    }
    _eventQueue.push(func);
}
export function $wrap(obj) {
    var _a;
    if (obj instanceof Element) {
        return new ElementContainer(obj);
    }
    if (obj instanceof Window) {
        return new EventTargetContainer(window, (_a = document === null || document === void 0 ? void 0 : document.documentElement) !== null && _a !== void 0 ? _a : crashOrDefault(null, 'Document element not available yet'));
    }
    if (obj instanceof Document) {
        return new EventTargetContainer(document, document.documentElement);
    }
    if (obj instanceof BaseContainer) {
        return obj;
    }
    if (obj instanceof NodeList || obj instanceof HTMLCollection || Array.isArray(obj)) {
        return new ElementListContainer(obj);
    }
    // TODO generic documents/windows?
    return crashOrDefault(EmptyContainer, 'Unknown object type ' + obj.prototype);
}
export function $d(arg) {
    switch (typeof arg) {
        case 'string':
            return $element(arg, document, /*alwaysQuerySelector*/ false, /*rootIsDocument*/ true);
        case 'function':
            return $onLoad(arg);
        case 'object':
            return $wrap(arg);
    }
}
(function ($d) {
    // all-in-one
    function strict(arg) {
        const originalUseStrict = $d.useStrict;
        $d.useStrict = true;
        try {
            const result = $d(arg);
            if (result && !result.element)
                throw new Error(`$d call for "${arg}" returned empty`);
            return result;
        }
        finally {
            $d.useStrict = originalUseStrict;
        }
    }
    $d.strict = strict;
    /** set to true to fallback to querySelector without passing alwaysQuerySelector=true */
    $d.allowQuerySelector = true;
    /** set to true to throw instead of nooping when an error occurs */
    $d.useStrict = false;
    /** set to true for verbose logging for debugging purposes */
    $d.verbose = false;
})($d || ($d = {}));
const whitespaceRegex = /[^\x20\t\r\n\f]+/g;
export class BaseContainer {
    /**
     * Returns the first element represented by this container. If there is only one element, returns that element. If
     * there are no elements, returns null.
     */
    get element() {
        return this.elements[0]; // can be overriden if elements is not an array
    }
    /**
     * Get a given element at an index.
     */
    get(index) {
        return this.elements[index]; // can be overriden if elements is not an array
    }
    /**
     * Throws an error if this node contains no elements, and returns the current object otherwise. Methods that operate
     * on this.elements will never throw if the list is empty, so this is an option.
     */
    throwIfEmpty() {
        if (!this.element) {
            throw new Error('No elements in DOMTools node');
        }
        return this;
    }
    /**
     * Utility for TypeScript - it is not yet possible (issue #34636) to have both an assertion and a return statement,
     * so throwIfEmpty and narrowNotEmpty let you choose which you want.
     */
    narrowNotEmpty() {
        this.throwIfEmpty();
    }
    get data() {
        this.narrowNotEmpty();
        if (!('dataset' in this.element)) {
            throw new Error('Element is not capable of storing data');
        }
        return this.element.dataset;
    }
    withData(operation) {
        operation(this.data);
        return this;
    }
    html(string) {
        var _a, _b;
        if (string !== undefined) {
            for (const el of this.elements) {
                el.innerHTML = string;
            }
            return this;
        }
        return (_b = (_a = this.element) === null || _a === void 0 ? void 0 : _a.innerHTML) !== null && _b !== void 0 ? _b : crashOrDefault('');
    }
    empty() {
        return this.html('');
    }
    append(arg) {
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
        }
        else if (arg instanceof BaseContainer) {
            for (const el of arg.elements) {
                this.element.appendChild(el);
            }
        }
        else if (arg instanceof Node) {
            this.element.appendChild(arg);
        }
        else {
            return crashOrDefault(this, 'Unsupported argument type, must be Node or DOMTools node or array thereof');
        }
        return this;
    }
    appendToAll(arg) {
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
        }
        else if (arg instanceof BaseContainer) {
            for (const ownEl of this.elements) {
                for (const el of arg.elements) {
                    ownEl.appendChild(el.cloneNode(true));
                }
            }
        }
        else if (arg instanceof Node) {
            for (const el of this.elements) {
                el.appendChild(arg.cloneNode(true));
            }
        }
        else {
            return crashOrDefault(this, 'Unsupported argument type, must be element or DOMTools node or array thereof');
        }
        return this;
    }
    appendText(text) {
        for (const el of this.elements) {
            el.appendChild(document.createTextNode(text));
        }
        return this;
    }
    attr(name, value) {
        var _a, _b;
        if (value !== undefined) {
            for (const el of this.elements) {
                el.setAttribute(name, value);
            }
            return this;
        }
        return (_b = (_a = this.element) === null || _a === void 0 ? void 0 : _a.getAttribute(name)) !== null && _b !== void 0 ? _b : crashOrDefault('');
    }
    // supports comma-separated OR space-separated classes, not both at the same time
    addClass(class1, ...otherClasses) {
        if (otherClasses.length !== 0) {
            for (const el of this.elements) {
                el.classList.add(class1, ...otherClasses);
            }
        }
        else {
            const results = class1.match(whitespaceRegex);
            if (results === null) { // No match, for any reason
                for (const el of this.elements) {
                    el.classList.add(class1);
                }
            }
            else {
                for (const el of this.elements) {
                    el.classList.add(...results);
                }
            }
        }
        return this;
    }
    // TODO support same as above & add toggleClass
    removeClass(dropClass) {
        for (const el of this.elements) {
            el.classList.remove(dropClass);
        }
        return this;
    }
    children() {
        const allChildren = [];
        for (const el of this.elements) {
            allChildren.push(...el.children);
        }
        return new ElementListContainer(allChildren);
    }
    parent() {
        const parents = new Set();
        for (const el of this.elements) {
            if (el.parentElement !== null) {
                parents.add(el.parentElement);
            }
        }
        return new ElementListContainer([...parents]);
    }
    find(selector, alwaysQuerySelector) {
        const matchingElements = new Set();
        for (const el of this.elements) {
            for (const match of $element(selector, el, alwaysQuerySelector).elements) {
                matchingElements.add(match);
            }
        }
        return new ElementListContainer([...matchingElements]);
    }
    remove() {
        for (const el of this.elements) {
            el.remove();
        }
        return this; // returns detached elements
    }
    on(type, listener, options) {
        for (const el of this.elements) {
            el.addEventListener(type, listener, options);
        }
        return this;
    }
    once(type, listener, useCapture) {
        for (const el of this.elements) {
            el.addEventListener(type, listener, { capture: useCapture, once: true });
        }
        return this;
    }
    off(type, listener, options) {
        for (const el of this.elements) {
            el.removeEventListener(type, listener, options);
        }
        return this;
    }
    // foreach, without creating any sort of DOMNode(s)
    each(callback) {
        const elements = this.elements;
        for (let i = 0, len = elements.length; i < len; i++) {
            callback(elements[i], i, elements);
        }
        return this;
    }
    // map, without creating any sort of DOMNode(s)
    map(callback) {
        const elements = this.elements;
        const arr = new Array(elements.length);
        for (let i = 0, len = elements.length; i < len; i++) {
            arr[i] = callback(elements[i], i, elements);
        }
        return arr;
    }
    $each(callback) {
        const elements = this.elements;
        for (let i = 0, len = elements.length; i < len; i++) {
            callback(new ElementContainer(elements[i]), i, elements);
        }
        return this;
    }
    $map(callback) {
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
        this._originalDisplay = this.css('display');
        this.css('display', 'none');
        return this;
    }
    show() {
        this.css('display', this._originalDisplay || '');
        delete this._originalDisplay;
        return this;
    }
    css(property, value) {
        if (value === undefined) {
            return this.element ? this.element.style.getPropertyValue(property) : crashOrDefault('');
        }
        for (const el of this.elements) {
            el.style[property] = value;
        }
        return this;
    }
    clearChildren() {
        for (const el of this.elements) {
            let firstChild;
            while (firstChild = el.firstChild)
                firstChild.remove();
        }
        return this;
    }
    text(string) {
        if (string !== undefined) {
            for (const el of this.elements) {
                let firstChild;
                while (firstChild = el.firstChild)
                    firstChild.remove();
                el.appendChild(document.createTextNode(string));
            }
            return this;
        }
        const text = [];
        for (const el of this.elements) {
            text.push(el.innerText); // only visible text
        }
        return text.join('');
    }
    val(value) {
        var _a, _b;
        if (value !== undefined) {
            for (const el of this.elements) {
                el.value = value;
            }
            return this;
        }
        return (_b = (_a = this.element) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : crashOrDefault(undefined);
    }
    checked(value) {
        var _a, _b;
        if (value !== undefined) {
            for (const el of this.elements) {
                el.checked = el.checked !== undefined ? value : crashOrDefault(value, 'Element is not a checkbox');
            }
            return this;
        }
        return (_b = (_a = this.element) === null || _a === void 0 ? void 0 : _a.checked) !== null && _b !== void 0 ? _b : crashOrDefault(undefined, 'Element is not a checkbox');
    }
    _eventFunction(name, callback, useCapture) {
        return this.on(name, callback, useCapture);
    }
    _dualEventFunction(name, callback, useCapture) {
        if (callback) {
            return this.on(name, callback, useCapture);
        }
        for (const el of this.elements) {
            el[name]();
        }
        return this;
    }
    click(callback, useCapture) { return this._dualEventFunction('click', callback, useCapture); }
    blur(callback, useCapture) { return this._dualEventFunction('blur', callback, useCapture); }
    focus(callback, useCapture) { return this._dualEventFunction('focus', callback, useCapture); }
    keypress(callback, useCapture) { return this._eventFunction('keypress', callback, useCapture); }
    submit(callback, useCapture) { return this._eventFunction('submit', callback, useCapture); }
    load(callback, useCapture) { return this._eventFunction('load', callback, useCapture); }
    dblclick(callback, useCapture) { return this._eventFunction('dblclick', callback, useCapture); }
    keydown(callback, useCapture) { return this._eventFunction('keydown', callback, useCapture); }
    change(callback, useCapture) { return this._eventFunction('change', callback, useCapture); }
    resize(callback, useCapture) { return this._eventFunction('resize', callback, useCapture); }
    mouseenter(callback, useCapture) { return this._eventFunction('mouseenter', callback, useCapture); }
    keyup(callback, useCapture) { return this._eventFunction('keyup', callback, useCapture); }
    scroll(callback, useCapture) { return this._eventFunction('scroll', callback, useCapture); }
    mouseleave(callback, useCapture) { return this._eventFunction('mouseleave', callback, useCapture); }
    unload(callback, useCapture) { return this._eventFunction('unload', callback, useCapture); }
}
const _emptyArray = [];
class EmptyContainer extends BaseContainer {
    get elements() {
        return _emptyArray;
    }
    get element() {
        return null;
    }
}
class ElementContainer extends BaseContainer {
    constructor(element) {
        super();
        this._elements = [element];
    }
    get element() {
        return this._elements[0];
    }
    get elements() {
        return this._elements;
    }
    // less memory-intensive implementations...
    children() {
        return new ElementListContainer(this.element.children);
    }
    parent() {
        return this.element.parentElement !== null ? new ElementContainer(this.element.parentElement) : crashOrDefault(EmptyContainer, 'Element lacks a parent');
        ;
    }
    find(selector, alwaysQuerySelector) {
        return $element(selector, this.element, alwaysQuerySelector);
    }
    each(callback) {
        callback(this.element, 0, this.elements);
        return this;
    }
    map(callback) {
        return [callback(this.element, 0, this.elements)];
    }
    $each(callback) {
        callback(new ElementContainer(this.element), 0, this.elements);
        return this;
    }
    $map(callback) {
        let newElement = callback(this, 0, this.elements);
        if (!(newElement instanceof BaseContainer)) {
            newElement = new ElementContainer(newElement);
        }
        return newElement;
    }
}
export class ElementListContainer extends BaseContainer {
    // elements: NodeList, Array, anything with a length property and indexer, except DOMNodeCollection, or array of DOMBaseNode
    constructor(elements) {
        super();
        this._elements = elements;
    }
    get elements() {
        return this._elements;
    }
}
// special case- a DOMNode that isn't really a DOMNode, just an EventTarget with a node representation elsewhere
export class EventTargetContainer extends ElementContainer {
    constructor(eventTarget, element) {
        super(element);
        this._eventTarget = eventTarget;
    }
    on(type, listener, options) {
        this._eventTarget.addEventListener(type, listener, options);
        return this;
    }
    once(type, listener, useCapture) {
        this._eventTarget.addEventListener(type, listener, { capture: useCapture, once: true });
        return this;
    }
    off(type, listener, options) {
        this._eventTarget.removeEventListener(type, listener, options);
        return this;
    }
}
export default $d;
export const $window = $d.strict(window);
export const $document = $d.strict(document);
//# sourceMappingURL=dom-tools.js.map