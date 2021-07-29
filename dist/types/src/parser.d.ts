import { LISP } from "./types";
export declare const SpecialCharacters: {
    readonly alarm: "\u0007";
    readonly backspace: "\b";
    readonly delete: "";
    readonly escape: "\u001B";
    readonly newline: "\n";
    readonly null: "\0";
    readonly return: "\r";
    readonly space: " ";
    readonly tab: "\t";
};
export declare type ParserOptions = {
    removeLineInfo: boolean;
};
export declare const fromStringToTokens: (src: string, filename?: string | undefined) => [token: string, info: LISP.SourceInfo][];
export declare const fromTokensToTokenTrees: (tokens: ReturnType<typeof fromStringToTokens>) => [LISP.TokenTree[], ReturnType<typeof fromStringToTokens>];
export declare const fromTokenTreeToObject: (node: LISP.ExtendedTokenTree, info?: LISP.SourceInfo | null, options?: ParserOptions | undefined, labels?: Map<string, LISP.Object>) => LISP.Object;
export declare const fromJS: (node: LISP.ExtendedTokenTree, info?: LISP.SourceInfo | null, options?: ParserOptions | undefined, labels?: Map<string, LISP.Object>) => LISP.Object;
export declare const fromProgramToAST: (src: string, options?: ParserOptions | undefined) => LISP.AST;
export declare const parser: (src: string, options?: ParserOptions | undefined) => LISP.AST;
export default parser;
