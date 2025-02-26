/**
 * Type declarations for test utilities
 */

// Fix supertest compatibility issues
declare module 'supertest' {
  import { Test } from 'supertest';
  import { RequestMethods } from 'supertest';
  import { Response } from 'superagent';

  export default function supertest(app: any): RequestMethods<Test> & {
    agent: () => RequestMethods<Test>;
  };

  export interface SuperTest<T extends Test> extends RequestMethods<T> {
    path: string;
  }

  export interface TestAgent<T extends Test> extends RequestMethods<T> {
    path: string;
  }

  export interface Request {
    path: string;
    [key: string]: any;
  }
}

// Jest mocks
declare namespace jest {
  // Allow mocking resolved/rejected values
  interface MockInstance<T = any, Y extends any[] = any[], R = any> {
    mockResolvedValue: (value: any) => MockInstance<T, Y, R>;
    mockRejectedValue: (value: any) => MockInstance<T, Y, R>;
    mockImplementation: (fn: (...args: any[]) => any) => MockInstance<T, Y, R>;
    mockReturnValue: (value: any) => MockInstance<T, Y, R>;
  }

  // Add missing jest function
  function fn<T extends (...args: any[]) => any>(implementation?: T): MockInstance<T>;
  function spyOn(object: any, method: string): MockInstance;
} 