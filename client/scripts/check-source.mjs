import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;
const root = path.resolve(import.meta.dirname, '../src');
const globals = new Set([
  'Array', 'ArrayBuffer', 'BigInt', 'Blob', 'Boolean', 'Date', 'Error', 'Event', 'CustomEvent',
  'File', 'FileReader', 'FormData', 'Function', 'Intl', 'JSON', 'Map', 'Math', 'Number', 'Object',
  'Promise', 'RegExp', 'Set', 'String', 'Symbol', 'TypeError', 'URL', 'URLSearchParams', 'Uint8Array',
  'WeakMap', 'WeakSet', 'Infinity', 'NaN', 'undefined', 'structuredClone', 'console', 'globalThis', 'window', 'document',
  'navigator', 'location', 'localStorage', 'sessionStorage', 'performance', 'fetch', 'crypto',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'queueMicrotask', 'getComputedStyle', 'matchMedia', 'atob', 'btoa',
  'decodeURIComponent', 'encodeURIComponent', 'encodeURI', 'decodeURI', 'parseInt', 'parseFloat',
  'isNaN', 'isFinite', 'DOMParser', 'Node', 'NodeFilter', 'HTMLElement', 'HTMLInputElement',
  'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLButtonElement', 'IntersectionObserver',
  'ResizeObserver', 'MutationObserver', 'AbortController', 'AbortSignal', 'Image', 'Worker',
]);
let files = 0;
const errors = new Set();
function check(file) {
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  files++;
  const report = (name, scope, node) => {
    if (!scope.hasBinding(name) && !globals.has(name)) errors.add(`${path.relative(root, file)}:${node.loc.start.line}: unbound identifier ${name}`);
  };
  traverse(ast, {
    ReferencedIdentifier(p) { report(p.node.name, p.scope, p.node); },
    JSXOpeningElement(p) {
      let name = p.node.name;
      while (name.type === 'JSXMemberExpression') name = name.object;
      if (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) report(name.name, p.scope, name);
    },
  });
}
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) check(file);
  }
}
walk(root);
for (const error of errors) console.error(error);
console.log(`Checked ${files} source files: ${errors.size} unbound references.`);
process.exitCode = errors.size ? 1 : 0;
