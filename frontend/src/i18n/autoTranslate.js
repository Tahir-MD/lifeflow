import { translations } from "./translations.js";

/**
 * Translates text that is already on the screen. It walks over every piece of
 * text and every placeholder, and swaps English words for Urdu or Sindhi when
 * the exact English text is in the dictionary. Texts with numbers inside, such
 * as "3 of 5 bags still needed", are matched with the patterns in
 * translations.js. When the person switches back to English the original text
 * is restored.
 */
let observer = null;
let activeLanguage = "en";
const originals = new WeakMap(); // text node or element -> { original, shown }
const ATTRIBUTES = ["placeholder", "title", "aria-label"];

function lookup(language, raw) {
  const dictionary = translations[language] || {};
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (dictionary[text]) return dictionary[text];
  const patterns = (translations.patterns && translations.patterns[language]) || [];
  for (const [regex, build] of patterns) {
    const match = text.match(regex);
    if (match) return build(...match.slice(1).map((part) => (dictionary[part] ? dictionary[part] : part)));
  }
  return null;
}

function skip(node) {
  const parent = node.nodeType === 3 ? node.parentElement : node;
  if (!parent) return true;
  if (["SCRIPT", "STYLE", "TEXTAREA", "CODE"].includes(parent.tagName)) return true;
  return Boolean(parent.closest("[data-no-translate]"));
}

function translateTextNode(node) {
  if (skip(node)) return;
  const known = originals.get(node);
  if (known && known.shown === node.data) return; // already translated by us
  const result = lookup(activeLanguage, node.data);
  if (result) {
    const lead = node.data.match(/^\s*/)[0];
    const trail = node.data.match(/\s*$/)[0];
    const shown = lead + result + trail;
    originals.set(node, { original: node.data, shown });
    node.data = shown;
  }
}

function translateAttributes(element) {
  if (skip(element)) return;
  ATTRIBUTES.forEach((name) => {
    const value = element.getAttribute && element.getAttribute(name);
    if (!value) return;
    const key = `${name}:`;
    const known = originals.get(element) || {};
    if (known[key] && known[key].shown === value) return;
    const result = lookup(activeLanguage, value);
    if (result) {
      known[key] = { original: value, shown: result };
      originals.set(element, known);
      element.setAttribute(name, result);
    }
  });
}

function walk(root) {
  if (root.nodeType === 3) { translateTextNode(root); return; }
  if (root.nodeType !== 1) return;
  translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === 3) translateTextNode(node);
    else translateAttributes(node);
    node = walker.nextNode();
  }
}

function restore(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const known = originals.get(node);
    if (known) {
      if (node.nodeType === 3 && known.shown === node.data) node.data = known.original;
      if (node.nodeType === 1) {
        ATTRIBUTES.forEach((name) => {
          const entry = known[`${name}:`];
          if (entry && node.getAttribute(name) === entry.shown) node.setAttribute(name, entry.original);
        });
      }
    }
    node = walker.nextNode();
  }
}

export function startAutoTranslate(language) {
  stopAutoTranslate();
  activeLanguage = language;
  walk(document.body);
  observer = new MutationObserver((mutations) => {
    observer.disconnect();
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") translateTextNode(mutation.target);
      else if (mutation.type === "attributes") translateAttributes(mutation.target);
      else mutation.addedNodes.forEach((added) => walk(added));
    });
    attach();
  });
  attach();
}

function attach() {
  if (observer) {
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRIBUTES,
    });
  }
}

export function stopAutoTranslate() {
  if (observer) { observer.disconnect(); observer = null; }
  if (activeLanguage !== "en") restore(document.body);
  activeLanguage = "en";
}
