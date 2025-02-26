/**
 * Jest Type Declarations
 * 
 * This file provides type declarations for Jest testing utilities
 * to ensure proper type checking in test files.
 */

declare namespace jest {
  type Mock<T extends Function = Function> = {
    new (...args: any[]): T;
    (...args: any[]): any;
    mockImplementation: (fn: (...args: any[]) => any) => Mock;
    mockReturnValue: (value: any) => Mock;
    mockReturnThis: () => Mock;
    mockResolvedValue: (value: any) => Mock;
    mockRejectedValue: (value: any) => Mock;
    mockClear: () => Mock;
    mockReset: () => Mock;
    mockRestore: () => Mock;
    mockName: (name: string) => Mock;
    getMockName: () => string;
    mock: {
      calls: any[][];
      instances: any[];
      invocationCallOrder: number[];
      results: { type: string; value: any }[];
    };
  };

  function fn<T extends Function = Function>(): Mock<T>;
  function fn<T extends Function = Function>(implementation: (...args: any[]) => any): Mock<T>;
  function spyOn<T extends {}, M extends keyof T>(object: T, method: M): Mock;
  function mock(moduleName: string, factory?: () => any, options?: { virtual?: boolean }): void;
}

// Add this for test file type checking
declare const expect: {
  (value: any): {
    toBe: (expected: any) => void;
    toEqual: (expected: any) => void;
    toBeDefined: () => void;
    toBeUndefined: () => void;
    toBeNull: () => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toContain: (expected: any) => void;
    toHaveLength: (expected: number) => void;
    toHaveProperty: (property: string, value?: any) => void;
    toThrow: (expected?: any) => void;
    toMatch: (pattern: RegExp | string) => void;
    toMatchObject: (expected: object) => void;
    toBeInstanceOf: (expected: any) => void;
    toBeGreaterThan: (expected: number) => void;
    toBeGreaterThanOrEqual: (expected: number) => void;
    toBeLessThan: (expected: number) => void;
    toBeLessThanOrEqual: (expected: number) => void;
    resolves: any;
    rejects: any;
    not: any;
  };
  arrayContaining: (arr: any[]) => any;
  objectContaining: (obj: object) => any;
  stringContaining: (str: string) => any;
  stringMatching: (str: string | RegExp) => any;
}; 