import { LISP } from "./types";
export declare type UnparserOptions = {
    extended?: boolean;
    shared?: boolean;
    maxdepth?: number;
};
export declare const fromTokensToString: (tokens: LISP.Token[]) => string;
export declare const fromTokenTreesToTokens: (trees: LISP.TokenTree[]) => LISP.Token[];
export declare const fromObjectToTokenTree: <T extends UnparserOptions = {
    extended: false;
}>(obj: LISP.Object, options?: T | undefined) => T extends {
    extended: true;
} ? LISP.ExtendedTokenTree : LISP.TokenTree;
export declare const toJS: (obj: LISP.Object) => LISP.ExtendedTokenTree;
export declare const writeObject: (obj: LISP.Object, options?: Omit<UnparserOptions, "extended">) => string;
export declare const fromASTToText: (ast: LISP.AST, options?: Omit<UnparserOptions, "extended">) => string;
export declare const unparser: (ast: LISP.AST, options?: Omit<UnparserOptions, "extended">) => string;
export default unparser;
