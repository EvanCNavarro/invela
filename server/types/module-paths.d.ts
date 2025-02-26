/**
 * TypeScript Module Path Declarations
 * 
 * This file defines type declarations for path aliases used in the project
 * to help TypeScript understand the imports using @db and @shared paths.
 */

declare module '@db' {
  export * from '../../db/index';
  export * from '../../db/schema';
  
  import { default as dbDefault } from '../../db/index';
  export default dbDefault;
}

declare module '@db/*' {
  export * from '../../db/*';
}

declare module '@shared' {
  export * from '../../shared/index';
}

declare module '@shared/*' {
  export * from '../../shared/*';
} 