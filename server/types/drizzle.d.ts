/**
 * Drizzle ORM Type Declarations
 * 
 * This file provides type declarations for Drizzle ORM operations
 * used throughout the codebase.
 */

// Enhance and extend existing database types
declare module 'server/utils/db-adapter.ts' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  
  export interface DatabaseAdapter {
    insert: (table: any) => {
      values: (data: any) => {
        returning: () => Promise<any[]>;
      };
    };
    update: (table: any) => {
      set: (data: any) => {
        where: (condition: any) => {
          returning: () => Promise<any[]>;
        };
      };
    };
    delete: (table: any) => {
      where: (condition: any) => {
        returning: () => Promise<any[]>;
      };
    };
    select: (columns?: any) => {
      from: (table: any) => {
        where: (condition: any) => Promise<any[]>;
        innerJoin: (table: any, condition: any) => {
          where: (condition: any) => Promise<any[]>;
        };
        orderBy: (column: any) => Promise<any[]>;
      };
    };
    transaction: <T>(callback: (tx: DatabaseAdapter) => Promise<T>) => Promise<T>;
    query: {
      [key: string]: {
        findMany: (options?: any) => Promise<any[]>;
        findFirst: (options?: any) => Promise<any>;
      };
    };
  }

  export function getDb(): DatabaseAdapter;
  export function executeWithNeonRetry<T>(operation: () => Promise<T>, retries?: number): Promise<T>;
  export function queryWithNeonRetry<T>(operation: () => Promise<T>, retries?: number): Promise<T>;
}

// SQL helper functions
declare module 'drizzle-orm' {
  export function eq(column: any, value: any): any;
  export function and(...conditions: any[]): any;
  export function or(...conditions: any[]): any;
  export function desc(column: any): any;
  export function asc(column: any): any;
  export function ilike(column: any, value: any): any;
  export const sql: {
    raw: (sql: string, ...values: any[]) => any;
  };
} 