/**
 * Performance Metrics Service
 * 
 * Tracks query performance and system metrics to:
 * - Identify slow operations
 * - Monitor app health
 * - Optimize bottlenecks
 */

import { supabase } from '../config/supabase';
import userIdentityService from '../services/userIdentityService';
import logger from './logger';

interface MetricData {
    operation: string;
    duration_ms: number;
    user_id?: string;
    metadata?: Record<string, any>;
}

class MetricsService {
    private metricsQueue: MetricData[] = [];
    private isSending = false;

    /**
     * Track the performance of an operation
     */
    async trackPerformance(
        operation: string,
        startTime: number,
        metadata?: any
    ): Promise<void> {
        const duration = Date.now() - startTime;

        // Get user ID
        let userId: string | undefined;
        try {
            userId = await userIdentityService.getUserId();
        } catch (e) {
            userId = undefined;
        }

        const metric: MetricData = {
            operation,
            duration_ms: duration,
            user_id: userId,
            metadata: metadata || {}
        };

        // Log slow operations
        if (duration > 1000) {
            logger.warn('Slow operation detected', {
                service: 'metricsService',
                action: operation,
                userId,
                metadata: { duration_ms: duration, ...metadata }
            });
        }

        // Queue metric for batch insert
        this.metricsQueue.push(metric);

        // Flush queue periodically
        if (this.metricsQueue.length >= 10) {
            await this.flushMetrics();
        }
    }

    /**
     * Utility to wrap async operations with performance tracking
     */
    async measure<T>(
        operation: string,
        fn: () => Promise<T>,
        metadata?: any
    ): Promise<T> {
        const startTime = Date.now();
        try {
            const result = await fn();
            await this.trackPerformance(operation, startTime, metadata);
            return result;
        } catch (error) {
            await this.trackPerformance(operation, startTime, {
                ...metadata,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Flush metrics queue to Supabase
     */
    private async flushMetrics(): Promise<void> {
        if (this.isSending || this.metricsQueue.length === 0) {
            return;
        }

        this.isSending = true;
        const metricsToSend = [...this.metricsQueue];
        this.metricsQueue = [];

        try {
            const { error } = await supabase
                .from('performance_metrics')
                .insert(metricsToSend);

            if (error && __DEV__) {
                console.error('Failed to insert metrics:', error);
                // Put failed metrics back in queue
                this.metricsQueue.unshift(...metricsToSend);
            }
        } catch (error) {
            if (__DEV__) {
                console.error('Error flushing metrics queue:', error);
            }
            this.metricsQueue.unshift(...metricsToSend);
        } finally {
            this.isSending = false;
        }
    }

    /**
     * Force flush all pending metrics
     */
    async flush(): Promise<void> {
        if (this.metricsQueue.length > 0) {
            await this.flushMetrics();
        }
    }
}

export const metricsService = new MetricsService();
export default metricsService;
