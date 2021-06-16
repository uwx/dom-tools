# DOMTools
A fairly optimized DOM manipulation library. Vaguely inspired by jQuery syntax. Performance is a main focus.

## Installation

Either import the .ts file directly, if you're using TypeScript, or import the .js file for any of the available module formats:
* CommonJS: [out/commonjs/dom-tools.js](https://github.com/uwx/dom-tools/blob/master/out/commonjs/dom-tools.js)
* Browser ES Modules: [out/browser/dom-tools.js](https://github.com/uwx/dom-tools/blob/master/out/browser/dom-tools.js)

There currently isn't a version of DOMTools that targets the browser without using any module loaders, but you can try exposing
its properties to `Window` like this:

```html
<script type="module">
    import * as DOMTools from 'https://rawcdn.githack.com/uwx/dom-tools/0ffaa4212dee3fbd1e15a211aa3f470bed65f29b/out/browser/dom-tools.js';

    for (const [k, v] of Object.entries(DOMTools)) {
        window[k] = v;
    }
</script>
```
