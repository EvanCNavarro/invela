/**
 * Logger Service
 * 
 * Provides consistent logging throughout the application with support for
 * different log levels, contexts, and structured data.
 */

export class Logger {
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  
  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args);
  }
  
  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.prefix}]`;
    
    if (args.length > 0) {
      console.log(`${prefix} ${message}`, ...args);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

export default Logger;