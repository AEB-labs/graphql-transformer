export function objectValues<T>(obj: { [name: string]: T }): T[] {
    return Object.keys(obj).map(i => obj[i]);
}

export function mapValues<TIn, TOut>(obj: { [key: string]: TIn }, fn: (value: TIn, key: string) => TOut): { [key: string]: TOut } {
    const result: { [key: string]: TOut } = {};
    for (const key in obj) {
        result[key] = fn(obj[key], key);
    }
    return result;
}

export function filterValues<TValue>(obj: { [key: string]: TValue }, predicate: (value: TValue, key: string) => boolean): { [key: string]: TValue } {
    const result: { [key: string]: TValue } = {};
    for (const key in obj) {
        const value = obj[key];
        if (predicate(value, key)) {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Removes object properties and array values that do not match a predicate
 */
export function filterValuesDeep(obj: any, predicate: (value: any) => boolean): any {
    if (obj instanceof Array) {
        return obj
            .filter(predicate)
            .map(val => filterValuesDeep(val, predicate));
    }
    if (typeof obj === 'object' && obj !== null) {
        const filtered = filterValues(obj, predicate);
        return mapValues(filtered, val => filterValuesDeep(val, predicate));
    }
    return obj;
}

export function flatten<T>(input: T[][]): T[] {
    const arr: T[] = [];
    return arr.concat(...input);
}

export function flatMap<TIn, TOut>(input: TIn[], fn: (input: TIn) => TOut[]): TOut[] {
    return flatten(input.map(fn));
}

export function compact<T>(arr: (T | undefined | null)[]): T[] {
    return arr.filter(a => a != undefined) as T[];
}

/**
 * Binds a function, to an object, or returns undefined if the function is undefined
 * @param fn the function to bind
 * @param obj the object to bind the function to
 * @returns the bound function, or undefined
 */
export function bindNullable<T>(fn: (T & Function) | undefined, obj: any): (T & Function) | undefined {
    return fn ? fn.bind(obj) : fn;
}
