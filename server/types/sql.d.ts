/**
 * Type declarations for SQL functions and utilities
 */

declare module 'drizzle-orm/sql' {
  export function sql(strings: TemplateStringsArray, ...args: any[]): any;
  export namespace sql {
    export function raw(sqlString: string, ...values: any[]): any;
  }
}

// Add declarations for Drizzle operators
declare module 'drizzle-orm' {
  export function eq(column: any, value: any): any;
  export function and(...conditions: any[]): any;
  export function or(...conditions: any[]): any;
  export function desc(column: any): any;
  export function asc(column: any): any;
  export function ilike(column: any, value: any): any;
  
  export interface Table {
    id: any;
    [key: string]: any;
  }
  
  export interface PostgresJsDatabase<T extends Record<string, any> = any> {
    select<U = any>(columns?: any): {
      from<V = any>(table: any): {
        where(condition: any): Promise<V[]>;
        innerJoin(table: any, condition: any): {
          where(condition: any): Promise<any[]>;
        };
        orderBy(column: any): Promise<V[]>;
      };
    };
    insert(table: any): {
      values(data: any): {
        returning(): Promise<any[]>;
      };
    };
    update(table: any): {
      set(data: any): {
        where(condition: any): {
          returning(): Promise<any[]>;
        };
      };
    };
    delete(table: any): {
      where(condition: any): {
        returning(): Promise<any[]>;
      };
    };
    transaction<U>(callback: (tx: PostgresJsDatabase<T>) => Promise<U>): Promise<U>;
    query: {
      [key: string]: {
        findMany(options?: any): Promise<any[]>;
        findFirst(options?: any): Promise<any>;
      };
    };
  }
} 