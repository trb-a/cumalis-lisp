import { LISP } from "./types";
import { create, is, isDictionary, JSNumberToNumber, numberToJSNumber, foldcase } from "./utils";

// ------------------------------------------------
//             Contants
// ------------------------------------------------

const TokenRe = new RegExp("(?:"+[
  /\s+/.source, // space
  /;[^\n]*(?:\n|$)/.source, // comment (end of line)
  /(?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])+/.source, // Bare identifier or bare number or dot
  /\|(?:[^|\\]|\n|\\(?:.|\n))+\|/.source, // Quoted identifier (multi-line)
  /#!(?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])+/.source, // directive
  /"(?:[^"\\]|\n|\\(?:.|\n))*"/.source, // String (multi-line)
  /(?:[()[\]{}'`]|,(?!@)|,@)/.source, // Curly, bracket, brace, quote, unquote
  /#(?:t(?:rue)?|f(?:alse)?|\(|u8\(|\d+[#=]|;)/.source, // datum label & datum comment & vector & byte-vector & boolean
  /#[dDbBoOxXeEiI](?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])+/.source, // sharp number
  /#\\(?:(?:[^A-Za-z]|\n)|[A-Za-z](?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])*)/.source, // sharp character (may have LF)
  // comment (nestable, up to 16 times, multi-line)
  Array(16).fill(/#\|(?:[^|#]|\|[^#]|#[^|]|\n|(?:NEST))*\|#/.source).reduce((prev, curr) => prev.replace("NEST", curr)),
].join("|") + ")", "y");

const StringEscapes: Record<string, string> = {
  a: "\x07",
  b: "\b",
  t: "\t",
  n: "\n",
  r: "\r",
};

// Special Characters (for <character> class)
export const SpecialCharacters = {
  alarm : "\u0007",
  backspace : "\u0008",
  delete : "\u007F",
  escape : "\u001B",
  newline : "\n",
  null : "\u0000",
  return : "\r",
  space : " ",
  tab : "\t",
} as const;

export type ParserOptions = {
  removeLineInfo?: boolean,
  extended?: boolean,
  filename?: string,
};

// ------------------------------------------------
//             Utilities
// ------------------------------------------------

// Get row/column from a position in the source.
const makeGetLineColumn = (src: string) => {
  const heads: number[] = [0];
  const re = /\n/g;
  for (let match: RegExpExecArray | null; (match = re.exec(src));) {
    heads.push(match.index + 1);
  }
  return (index: number) => {
    const lineStart = heads.filter(head => head <= index).slice(-1)[0];
    const str = src.slice(lineStart, index); // String before the specified position of the line
    return [
      heads.indexOf(lineStart) + 1,
      str.length + (str.match(/[^\x01-\x7E\xA1-\xDF]/g) ?? []).length + 1
    ];
  }
}

// ------------------------------------------------
//             Functions
// ------------------------------------------------

// S-expressions tokenizer.
// Handles #!fold-case and #!no-fold-case directive.
// Throws exceptions when any errors are found.
export const fromStringToTokens = (
  src: string, // The source (s-expressions).
  filename?: string, // Setting additional information about position of tokens.
): [token: string, info: LISP.SourceInfo][] => {
  const getLineColumn = makeGetLineColumn(src);
  const results: ReturnType<typeof fromStringToTokens> = [];
  TokenRe.lastIndex = 0;
  let doFoldcase = false; // See R7RS 2.1.
  while (TokenRe.lastIndex < src.length) {
    const index = TokenRe.lastIndex;
    const [line, column] = getLineColumn(index);
    const info: LISP.SourceInfo = filename ? { filename, line, column } : { line, column };
    let [token] = TokenRe.exec(src) ?? [];
    if (token === null || token === undefined) {
      const errStr = src.slice(index).split(/(\s|\n)+/, 2)[0] || src[index];
      const shortenErrStr = errStr.length > 10 ? errStr.slice(0,10)+"..." : errStr;
      throw new Error(`Tokenize failed. Unexpected token is: "${shortenErrStr}": ${JSON.stringify(info)}`);
    }
    if (token === "#!fold-case" || token === "#!no-fold-case") {
      doFoldcase = !token.includes("#!no-");
      continue;
    }
    if (doFoldcase && (
      token.match(/^(?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])+$/) ||
      token.match(/#\\(?:(?:[^A-Za-z]|\n)|[A-Za-z](?:[A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])*)/)
    )) {
      token = foldcase(token);
    }
    results.push([token, info]);
  }
  return results;
}

// Make an array of lexical trees from a token array removing spaces and comments.
// Returns an array of token trees and an array of left tokens.
export const fromTokensToTokenTrees = (
  tokens: ReturnType<typeof fromStringToTokens>
): [LISP.TokenTree[], ReturnType<typeof fromStringToTokens>] => {

  // Token list excluding spaces and most of comments.
  const leftTokens = tokens.filter(item => !item[0].match(/^(\s|;|#\||#!(no-)?fold-case)/));

  // Create and execute a recursive function that reads tokens in order from the above array
  // and makes it an array of lexical trees.This function recurses if there is an opening
  // parantheses, to read tokens upto the next closing parantheses.
  const fn = ()=>{
    const results: LISP.TokenTree[] = [];
    for (let item = leftTokens.shift(); item; item = leftTokens.shift()) {
      const [token, info] = item;
      if (token.match(/^(\s|;|#\|)/)) {
        continue;
      } else  if (token === "(") {
        results.push(fn().concat(info));
      } else if (["#(", "#u8("].includes(token)) {
        results.push([token.slice(0, -1), fn(), info]);
      } else if (["'", "`" , ",", ",@", "#;"].includes(token) || token.match(/^#\d+=$/)) {
        const siblings = fn();
        const next = siblings.shift();
        if (next === null || next === undefined) {
          throw (`Unexpected end of source after quoting/datum label "${token}": ${JSON.stringify(info)}`);
        }
        if (token !== "#;") {
          results.push([token, next]);
        }
        results.push(...siblings);
        return results;
      } else if (token === ")") {
        return results;
      } else {
        results.push(token);
      }
    }
    return results;
  }
  return [fn(), leftTokens];
}

// Make a a LISP object from a token tree or a extended token tree.
export const fromTokenTreeToObject = (
  node: LISP.ExtendedTokenTree,
  info: LISP.SourceInfo | null = null,
  options?: ParserOptions,
  labels = new Map<string, LISP.Object>(),
): LISP.Object => {

  if (typeof node === "string") {

    // Tokens

    let matches: RegExpMatchArray | null;
    if ((matches = /^([+-])(nan|inf)\.0$/i.exec(node))) {
      // NaN/Infinity literal.
      return create.Number(matches[0].toLowerCase());
    } else if ((matches = /^(?:#d)?[-+]?\d+(?:\.\d*)?(?:e[-+]?\d+)?$/i.exec(node))) {
      // Digital number literal. Note: We must eliminate the first 0.
      return JSNumberToNumber(Number(node.replace(/^(#d)?0*/i, "")));
    } else if ((matches = /^(?:#b[-+]?[01]+|#o[-+]?[0-7]+|#x[-+]?[0-9A-Fa-f]+)/i.exec(node))) {
      // Binary / octal / hexadecimal literal. Note: Number() doesn't accept +/- sign.
      return JSNumberToNumber(Number(node.replace(/^#([xob])([+-]?)/i, "0$1")) * (node.includes("-") ? -1 : 1));
    } else if (/^#[dboxei]/i.exec(node)) {
      // Numbers which are not supported yet.
      // (decimal of binary/octal/hexadecimal, exact/inexact, complex, fractional)
      // Note\: bynary/octal/hexadecimal numbers with decimals can be processed like below...
      // What about exponential notations?
      // let [i, d] = str.replace(/0+$/, "").split(/\./, 2);
      // return parseInt(i || "0", radix) + parseInt(d || "0", radix) * Math.pow(radix, -d.length);
      throw new Error(`Unsupported type of number literal: ${node}: ${JSON.stringify(info)}`)
    } else if ((matches = /^"((?:.|\n)*)"$/.exec(node))) {
      // String literal
      const str = matches[1]
        .replace(/\\(x[0-9a-fA-F]+;|[ \t]*\n[ \t]*|[^x \t\n])/g, s => {
          if (s[1] === "x") {
            return String.fromCodePoint(Number(`0x${s.replace(/;$/,"").slice(2)}`));
          } else if (/\s|\n/.test(s[1])) {
            return "";
          } else {
            return StringEscapes[s[1]] ?? s[1];
          }
        });
      return create.String(str, true);
    } else if ((matches = /^#([tf])/.exec(node))) {
      // Boolean
      return create.Boolean(matches[1] === "t");
    } else if ((matches = /^#\\((.|\n)*)$/.exec(node))) {
      // Character
      const c = matches[1].length === 1
        ? matches[1]
        : matches[1].match(/^x[0-9A-Fa-f]+$/)
          ? String.fromCodePoint(Number(`0x${matches[1].slice(1)}`))
          : SpecialCharacters[matches[1] as keyof typeof SpecialCharacters];
      if (!c) {
        throw new Error(`Illegal character literal: ${c}: ${JSON.stringify(info)}`);
      }
      return create.Character(c);
    } else if (node !== "." && (matches = /^(([A-Za-z0-9]|[^\x00-\x7f]|[!$%&*+\-./:<=>?@^_~])+)$/.exec(node))) {
      // Bare symbols.
      return create.Symbol(matches[1]);
    } else if (node !== "." && (matches = /^\|(([^\\]|\n|\\(.|\n))+)\|$/.exec(node))) {
      // Quoted symbols.
      const str = matches[1]
        .replace(/\\(x[0-9a-fA-F]+;|\s*\n\s*|[^x\s\n])/g, s => {
          if (s[1] === "x") {
            return String.fromCodePoint(Number(`0x${s.replace(/;$/,"").slice(2)}`));
          } else if (/\s|\n/.test(s[1])) {
            return "";
          } else {
            return StringEscapes[s[1]] ?? s[1];
          }
        });
      return create.Symbol(str);
    } else if ((matches = /^#(\d+)#$/.exec(node))) {
      // Datum reference
      const label = matches[1];
      if (!labels.has(label)) {
        throw new Error(`Invalid datum reference (${node}): ${JSON.stringify(info)}`);
      }
      return labels.get(label) as LISP.Object;
    } else {
      // Unexpected / Illegal token.
      throw new Error(`Parse error: unexpected token: "${node}": ${JSON.stringify(info)}`);
    }
  } else if (node instanceof Array && !(node[0] === "&")) { // Note: "&" is for JS Object.
    // Arrays (= in a list)

    info = node.find(item => isDictionary(item)) ?? info;
    const items: LISP.TokenTree[] = node.filter(item => !isDictionary(item));
    if (items.length === 0) {
      // End of a list
      return create.Null();
    } else if (items.length === 2 && items[0] === ".") {
      // End of a non-proper list.
      return fromTokenTreeToObject(items[1], info, options, labels);
    } else if (items[0] === "#") {
      // Vector. The next datum must be an array.
      if (items.length !== 2) {
        throw new Error(`Illegal vector literal. No datum: ${JSON.stringify(info)}`);
      }
      if (!(items[1] instanceof Array)) {
        throw new Error(`Illegal vector literal. Datum is not an array: ${JSON.stringify(info)}`);
      }
      return create.Vector(items[1].map(c => fromTokenTreeToObject(c, info, options, labels)), true);
    } else if (items[0] === "#u8") {
      // Byte Vector. The next datum must be an array of numbers.
      if (items.length !== 2) {
        throw new Error(`Illegal byte vector literal. No datum: ${JSON.stringify(info)}`);
      }
      if (!(items[1] instanceof Array)) {
        throw new Error(`Illegal byte vector literal. Byte vector must have an array: ${JSON.stringify(info)}`);
      }
      const children = items[1].map(c => fromTokenTreeToObject(c, info, options, labels));
      if (!(children.every((c): c is LISP.Number => is.RealNumber(c) && Number.isInteger(c[1]) && c[1] >= 0 && c[1] <= 255))) {
        throw new Error(`Illegal byte vector literal. All the contents of a byte vector must be 0-255.: ${JSON.stringify(info)}`);
      }
      return create.ByteVector(children.map(numberToJSNumber), true);
    } else if (typeof items[0] === "string" && (["'","`", ",", ",@"].includes(items[0]))) {
      // Quotes. There must be a next datum.
      if (items.length !== 2) {
        throw new Error(`Illegal quote "${items[0]}". Quoted item must be a datum: ${JSON.stringify(info)}`);
      }
      const str = {"'":"quote","`":"quasiquote", ",":"unquote", ",@":"unquote-splicing"}[items[0]]!;
      return create.Pair(
        create.Symbol(str),
        create.Pair(fromTokenTreeToObject(items[1], info, options, labels), create.Null(), true),
        true,
        options?.removeLineInfo ? null : info
      );
    } else if (typeof items[0] === "string" && /^#(\d+)=$/.exec(items[0])) {
      // Datum label. There must be a next datum like quotes.
      const [, label] = /^#(\d+)=$/.exec(items[0])!;
      if (items.length !== 2) {
        throw new Error(`Illegal datum label. No next datum: ${JSON.stringify(info)}`);
      }
      const placeholder = create.Symbol(items[0]);
      labels.set(label, placeholder);
      const ret = fromTokenTreeToObject(items[1], info, options, labels);
      (placeholder as any[]).splice(0, placeholder.length, ...ret);
      return placeholder;
    } else if (options?.extended && is.Object(node)) {
      return node;
    } else if (options?.extended && node[0] === "&") {
      if (node.length != 2) {
        throw new Error(`Parse error: JS Node must be like ["&", <object>]: ${typeof node} value: ${node}`);
      }
      return create.JS("inline", node[1])
    } else {
      // Any other list. Process car and cdr respectively.
      return create.Pair(
        fromTokenTreeToObject(items[0], info, options, labels),
        fromTokenTreeToObject(items.slice(1), info, options, labels),
        true,
        options?.removeLineInfo ? null : info
      );
    }

  } else if (options?.extended && node === null) {
    return create.Null();
  } else if (options?.extended && typeof node === "number") {
    return JSNumberToNumber(node);
  } else if (options?.extended && typeof node === "boolean") {
    return create.Boolean(node);
  } else {
    throw new Error(`Parse error: unexpected node type: ${typeof node} value: ${node}`);
  }
}

export const fromJS = (
  node: LISP.ExtendedTokenTree,
  info: LISP.SourceInfo | null = null,
  options?: Omit<ParserOptions, "extended">,
): LISP.Object => {
  return fromTokenTreeToObject(node, info, {
    ...(options ?? {}),
    extended: true,
  })
};

// Tokenize and parse a program (s-expressions) and build a AST with a root of "begin"
export const fromProgramToAST = (src: string, options?: ParserOptions): LISP.AST => {
  // Tokenize
  const tokens = fromStringToTokens(src, options?.filename);
  // Build a structure of tokens according to parentheses.
  const [trees, rest] = fromTokensToTokenTrees(tokens);
  if (rest.length > 0) {
    throw new Error(`Parse error: extra tokens. (missing right curly?), ${JSON.stringify(rest[0][1])}`);
  }
  // Parse the token tree to build AST.
  const ast = fromTokenTreeToObject(["begin", ...trees], null, options);
  return ast;
};

// Alias
export const parser = fromProgramToAST;

export default parser;
