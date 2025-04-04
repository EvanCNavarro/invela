interface LogContext {
  [key: string]: any;
}

export class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [${this.namespace}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    console.debug(this.formatMessage('DEBUG', message, context));
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.formatMessage('ERROR', message, context));
  }
}
