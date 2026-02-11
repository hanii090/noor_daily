/**
 * Structured Logger
 * 
 * Production-ready logging system that:
 * - Formats logs consistently
 * - Sends critical logs to Supabase for monitoring
 * - Provides better debugging in development
 * - Tracks errors and warnings in production
 */

import { supabase } from '../config/supabase';
import userIdentityService from '../services/userIdentityService';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    service: string;
    action: string;
    userId?: string;
    metadata?: Record<string, any>;
}

class Logger {
    private queue: any[] = [];
    private isSending = false;

    /**
     * Log a message with structured context
     */
    async log(level: LogLevel, message: string, context: LogContext): Promise<void> {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context
        };

        // Always log to console in development
        if (__DEV__) {
            this.consoleLog(level, logEntry);
        }

        // Send errors and warnings to Supabase for production monitoring
        if (level === 'error' || level === 'warn') {
            await this.sendToSupabase(logEntry);
        }
    }

    /**
     * Convenience methods for each log level
     */
    debug(message: string, context: LogContext): void {
        if (__DEV__) {
            this.log('debug', message, context);
        }
    }

    info(message: string, context: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, context: LogContext): void {
        this.log('error', message, context);
    }

    /**
     * Formatted console output for development
     */
    private consoleLog(level: LogLevel, entry: any): void {
        const emoji = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };

        const color = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m'  // Red
        };

        const reset = '\x1b[0m';

        console[level === 'debug' ? 'log' : level](
            `${emoji[level]} ${color[level]}[${entry.service}:${entry.action}]${reset}`,
            entry.message,
            entry.metadata || ''
        );
    }

    /**
     * Send log to Supabase for production monitoring
     */
    private async sendToSupabase(logEntry: any): Promise<void> {
        try {
            // Get user ID if available
            if (!logEntry.userId) {
                try {
                    logEntry.userId = await userIdentityService.getUserId();
                } catch (e) {
                    // User might not be initialized yet
                    logEntry.userId = null;
                }
            }

            // Queue the log (to batch requests)
            this.queue.push(logEntry);

            // Process queue if not already processing
            if (!this.isSending && this.queue.length >= 5) {
                await this.flushQueue();
            }

            // Set timeout to flush queue after 10 seconds
            setTimeout(() => {
                if (this.queue.length > 0) {
                    this.flushQueue();
                }
            }, 10000);
        } catch (error) {
            // Don't let logging errors crash the app
            if (__DEV__) {
                console.error('Failed to send log to Supabase:', error);
            }
        }
    }

    /**
     * Flush queued logs to Supabase
     */
    private async flushQueue(): Promise<void> {
        if (this.isSending || this.queue.length === 0) {
            return;
        }

        this.isSending = true;
        const logsToSend = [...this.queue];
        this.queue = [];

        try {
            const { error } = await supabase
                .from('app_logs')
                .insert(logsToSend);

            if (error) {
                if (__DEV__) {
                    console.error('Failed to insert logs:', error);
                }
                // Put failed logs back in queue
                this.queue.unshift(...logsToSend);
            }
        } catch (error) {
            if (__DEV__) {
                console.error('Error flushing log queue:', error);
            }
            this.queue.unshift(...logsToSend);
        } finally {
            this.isSending = false;
        }
    }

    /**
     * Force flush all pending logs (call on app shutdown)
     */
    async flush(): Promise<void> {
        if (this.queue.length > 0) {
            await this.flushQueue();
        }
    }
}

export const logger = new Logger();
export default logger;
