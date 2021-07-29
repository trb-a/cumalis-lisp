import { SpecialCharacters } from "./parser";
import { LISP } from "./types";
import { assert, is, numberToJSNumber } from "./utils";

// ------------------------------------------------
//              Constants
// ------------------------------------------------

const Quotings: Record<string, string> = {
  "quote": "'",
  "quasiquote": "`",
  "unquote": ",",
  "unquote-splicing": ",@",
};

// Regular expressions that match symbols that don't need to be quoted like |xxx|.
const BareIdentifierRe = /^(?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])+$/;

// A conversion tabble to serialize special characters in a string or symbol.
// Note: Both `"'and `|' are escaped to accommodate both symbols and strings.
const StringEscapeSpecials: Record<string, string> = {
  "\x07": "\\a",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "\"": "\\\"",
  "\\": "\\\\",
  "|": "\\|",
};

export type UnparserOptions = {
  extended?: boolean,
  shared?: boolean, // Only when extended = true. default = false
  maxdepth?: number, // Only when extended = true. default = Infinity
};

// ------------------------------------------------
//             Functions
// ------------------------------------------------

// Convert a token list to a string. The tokens are joined with spaces except:
// - No space after opening parentheses. (including vector and bytevector)
// - No space before closing parentheses.
// - No space after quotatings.
export const fromTokensToString = (tokens: LISP.Token[]): string => {
  // return tokens.reduce<string>((prev, curr) => {
  //   if (
  //     prev === "" || prev.endsWith("(") || curr.startsWith(")") ||
  //     Object.values(Quotings).some(q => prev.endsWith(q))
  //   ) {
  //     return prev + curr;
  //   } else {
  //     return prev + " " + curr;
  //   }
  // }, "");
  const ret = tokens.reduce<string>((prev, curr) => {
    if (
      prev === "" || prev.endsWith("(") || curr.startsWith(")") ||
      Object.values(Quotings).some(q => prev.endsWith(q))
    ) {
      return prev + curr;
    } else {
      return prev + " " + curr;
    }
  }, "");
  return ret;
};

// Convert a token tree to token list.
export const fromTokenTreesToTokens = (trees: LISP.TokenTree[]): LISP.Token[] => {
  const fn = (items: LISP.TokenTree[]): LISP.Token[] => {
    const results: LISP.Token[] = [];
    for (const item of items) {
      if (typeof item === "string") {
        // String tokens.
        results.push(item)
      } else if (item instanceof Array) {
        if (typeof item[0] === "string" && Object.values(Quotings).includes(item[0])) {
          // Quotings.
          results.push(...fn(item));
        } else if (item[0] === "#" || item[0] === "#u8") {
          // Vectors / Bytevectors.
          if (item.length !== 2 || !(item[1] instanceof Array)) {
            throw new Error("Illegal token tree: #/#u8 must have only one token array");
          }
          results.push(`${item[0]}(`);
          results.push(...fn(item[1]));
          results.push(")");
        } else if (typeof item[0] === "string" && /^#\d+=/.exec(item[0])) {
          // Datum label
          if (item.length !== 2) {
            throw new Error("Illegal token tree: datum label must have the content");
          }
          results.push(item[0], ...fn(item.splice(1)));
        } else {
          // Other arrays. Add parentheses before and after.
          results.push("(");
          results.push(...fn(item));
          results.push(")");
        }
      }
    }
    return results;
  };
  return fn(trees);
}

// Convert a LISP Object to a token tree or a extended token tree (JS object tree).
// extended: if true, returns a Javascript object tree.
// shared: if true, writes token labels for every shared objects (only when extended is not true).
export const fromObjectToTokenTree = <T extends UnparserOptions = { extended: false }>(
  obj: LISP.Object,
  options?: T,
): T extends { extended: true } ? LISP.ExtendedTokenTree : LISP.TokenTree => {
  const { extended = false, shared = false, maxdepth = Infinity } = options ?? {};

  // Study the tree to find objects to label.
  const foundObjects = new Set<LISP.Object>();
  const labelObjects = new Set<LISP.Object>();
  const study = (obj: LISP.Object, depth: number, ancestors: Set<LISP.Object>): void => {
    assert.Object(obj); // Sanity check.
    // Check depth.
    if (!extended) {
      if (depth > maxdepth) {
        return;
      }
    }
    if (!extended) {
      if (ancestors.has(obj) || (shared && foundObjects.has(obj))) {
        labelObjects.add(obj);
        return;
      }
    }
    foundObjects.add(obj);
    ancestors.add(obj);
    if (is.Pair(obj)) {
      study(obj[1], depth + 1, ancestors); study(obj[2], depth + 1, ancestors);
    } else if (is.Vector(obj)) {
      obj[1].forEach(item => study(item, depth + 1, ancestors));
    }
  }
  study(obj, 0, new Set());

  const labeledObjects = new Map<LISP.Object, number>();
  const fn = (obj: LISP.Object, depth: number, noLabel = false): LISP.ExtendedTokenTree | LISP.TokenTree => {
    assert.Object(obj); // Sanity check.

    // Check depth.
    if (!extended) {
      if (depth > maxdepth) {
        return "...";
      }
    }

    // Datum label
    if (!noLabel && !extended && labelObjects.has(obj)) {
      if (labeledObjects.has(obj)) {
        return `#${labeledObjects.get(obj)}#`;
      } else {
        const num = labeledObjects.size + 1;
        labeledObjects.set(obj, num);
        const ret = fn(obj, depth, true);
        return [`#${num}=`, ret];
      }
    }

    switch (obj[0]) {
      case "<symbol>":
        if (!extended) {
          return BareIdentifierRe.test(obj[1])
            ? obj[1]
            : '|' + obj[1].replace(
              /[\x00-\x1f\x7f"|\\]/g,
              c => StringEscapeSpecials[c] ?? `\\x${c.codePointAt(0)?.toString(16)}`
            ) + '|';
        } else {
          return obj[1];
        }
      case "<null>":
        if (!extended) {
          return [];
        } else {
          return null;
        }
      case "<string>":
        if (!extended) {
          return '"' + obj[1].replace(
            /[\x00-\x1f\x7f]"|\\/g,
            c => StringEscapeSpecials[c] ?? `\\x${c.codePointAt(0)?.toString(16)}`
          ) + '"';
        } else {
          return obj[1];
        }
      case "<number>":
        if (!extended) {
          return `${obj[1]}`;
        } else {
          return numberToJSNumber(obj);
        }
      case "<boolean>":
        if (!extended) {
          return obj[1] ? "#t" : "#f";
        } else {
          return obj[1];
        }
      case "<character>":
        if (!extended) {
          const [special] = Object.entries(SpecialCharacters).find(([, char]) => char === obj[1]) ?? [];
          return `#\\${special ?? obj[1]}`;
        } else {
          return obj[1];
        }
      case "<vector>": return [`#`, [...obj[1].map(c => fn(c, depth + 1))]];
      case "<bytevector>": return [`#u8`, [...obj[1].map(c => `${c}`)]];
      case "<pair>":
        const [, car, cdr] = obj;
        if (cdr[0] === "<null>") {
          return [fn(car, depth + 1)];
        } else if (cdr[0] !== "<pair>") {
          return [fn(car, depth + 1), ".", fn(cdr, depth + 1)];
        } else if (car[0] === "<symbol>" && Quotings[car[1]]) {
          return [Quotings[car[1]], ...(fn(cdr, depth + 1) as LISP.TokenTree[])];
        } else {
          return [fn(car, depth + 1), ...fn(cdr, depth + 1) as LISP.TokenTree[]]
        }
      case "<js>":
        if (!extended) {
          // Note: this string can't be parsed correctly.
          return `#<$js[${obj[1] === null ? "null" : typeof obj[1]}]>`;
        } else {
          return ["&", obj[1]];
        }
      case "<procedure>":
        if (!extended) {
          // Note: this string can't be parsed correctly.
          if (obj[1] === "built-in") {
            return `#<procedure[built-in/${obj[2]}]>`;
          } else {
            return `#<procedure[${obj[1]}]>`;
          }
        } else {
          return obj;
        }
      default:
        if (!extended) {
          // Note: this string can't be parsed correctly.
          return `#${obj[0]}`;
        } else {
          return obj;
        }
    }
  }
  return fn(obj, 0) as T extends true ? LISP.ExtendedTokenTree : LISP.TokenTree;
}

// Alias
export const toJS = (obj: LISP.Object): LISP.ExtendedTokenTree => fromObjectToTokenTree(obj, { extended: true });

// Write a S-expression from Object.
export const writeObject = (obj: LISP.Object, options: Omit<UnparserOptions, "extended"> = {}): string => {
  try {
    const tree = fromObjectToTokenTree(obj, { maxdepth: 8, ...options, extended: false });
    const tokens = fromTokenTreesToTokens([tree]);
    return fromTokensToString(tokens);
  } catch (e) {
    return "<!!WRITE-ERROR!!>";
  }
}

// Write S-expression program from AST.
// Note: The top level of AST is assumed to be a "begin" expression.
export const fromASTToText = (ast: LISP.AST, options: Omit<UnparserOptions, "extended"> = {}): string => {
  const tree = fromObjectToTokenTree(ast, { ...options, extended: false });
  if (!(tree instanceof Array && tree[0] === "begin")) {
    throw new Error(`fromASTToText error: The top of AST is must be a "begin" expression.`);
  }
  const tokens = fromTokenTreesToTokens(tree.slice(1));
  return fromTokensToString(tokens);
}

// Alias
export const unparser = fromASTToText;

export default unparser;
