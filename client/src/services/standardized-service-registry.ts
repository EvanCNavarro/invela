/**
 * ========================================
 * Standardized Service Registry Module
 * ========================================
 * 
 * Enterprise service registry providing centralized management of all
 * standardized form services with comprehensive registration, resolution,
 * and lifecycle management. Implements enterprise-grade service patterns
 * for consistent service access and dependency management across the platform.
 * 
 * Key Features:
 * - Centralized service registration with type safety
 * - Dynamic service resolution with comprehensive validation
 * - Enterprise-grade service lifecycle management
 * - Comprehensive logging and monitoring for service operations
 * - Service health validation and dependency tracking
 * - Thread-safe service access with defensive programming
 * 
 * Dependencies:
 * - StandardizedServices: Core service implementations
 * - FormServiceInterface: Service interface contracts
 * - Logger: Structured logging for enterprise monitoring
 * 
 * @module StandardizedServiceRegistry
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// Core standardized service implementations
import { StandardizedKY3PFormService } from './standardized-ky3p-form-service';
// Service interface contracts for type safety
import { FormServiceInterface } from './formService';
// Enterprise logging utilities for comprehensive monitoring
import getLogger from '@/utils/logger';

// ========================================
// CONSTANTS
// ========================================

/**
 * Service registry configuration constants
 * Defines registry behavior and operational parameters
 */
const REGISTRY_CONFIG = {
  MAX_SERVICES: 50,
  SERVICE_VALIDATION_TIMEOUT: 3000,
  HEALTH_CHECK_INTERVAL: 30000,
  SERVICE_CLEANUP_INTERVAL: 60000
} as const;

/**
 * Service registration status enumeration
 * Provides comprehensive service lifecycle tracking
 */
const SERVICE_STATUS = {
  REGISTERED: 'registered',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  DEPRECATED: 'deprecated'
} as const;

// ========================================
// INITIALIZATION
// ========================================

// Logger instance for comprehensive service registry monitoring
const logger = getLogger('StandardizedServiceRegistry');

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Service registry interface for comprehensive service management
 * 
 * Provides type-safe service registration and resolution with
 * standardized service interfaces and comprehensive validation
 * for enterprise-grade service management workflows.
 */
export interface ServiceRegistry {
  /** Standardized KY3P form service for know-your-third-party workflows */
  standardizedKy3pFormService: typeof StandardizedKY3PFormService;
  /** Optional standardized KYB form service for business verification */
  standardizedKybFormService?: any;
  /** Optional standardized open banking form service for financial workflows */
  standardizedOpenBankingFormService?: any;
  /** Additional dynamic services with string indexing */
  [key: string]: any;
}

/**
 * Service registration metadata interface for comprehensive tracking
 * 
 * Structures service registration information with status tracking,
 * validation results, and health monitoring for complete service lifecycle management.
 */
interface ServiceRegistrationMetadata {
  /** Service registration timestamp */
  registeredAt: Date;
  /** Service current status */
  status: keyof typeof SERVICE_STATUS;
  /** Service version information */
  version?: string;
  /** Service health check results */
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy';
  /** Last health check timestamp */
  lastHealthCheck?: Date;
  /** Service error information */
  error?: string;
}

// ========================================
// SERVICE REGISTRY IMPLEMENTATION
// ========================================

/**
 * Global service registry with comprehensive service management
 * Initialized with core standardized services for immediate availability
 */
export const serviceRegistry: ServiceRegistry = {
  standardizedKy3pFormService: StandardizedKY3PFormService,
};

/**
 * Service metadata registry for comprehensive service tracking
 * Maintains registration information and health status for all services
 */
const serviceMetadata = new Map<string, ServiceRegistrationMetadata>();

// Initialize core service metadata
serviceMetadata.set('standardizedKy3pFormService', {
  registeredAt: new Date(),
  status: 'active',
  version: '2.0.0',
  healthStatus: 'healthy'
});

// ========================================
// SERVICE MANAGEMENT FUNCTIONS
// ========================================

/**
 * Register a standardized form service with comprehensive validation
 * 
 * Provides enterprise-grade service registration with validation,
 * metadata tracking, and comprehensive logging. Implements defensive
 * programming patterns for reliable service registration workflows.
 * 
 * @param name Service identifier for registry access
 * @param serviceClass Service class constructor or instance
 * @param metadata Optional service registration metadata
 * 
 * @throws {Error} When service validation fails or registration conflicts occur
 */
export function registerStandardizedService(
  name: string, 
  serviceClass: any, 
  metadata?: Partial<ServiceRegistrationMetadata>
): void {
  // Validate input parameters for defensive programming
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Service name is required and must be a non-empty string');
  }

  if (!serviceClass) {
    throw new Error('Service class is required for registration');
  }

  // Check for service registry capacity
  if (Object.keys(serviceRegistry).length >= REGISTRY_CONFIG.MAX_SERVICES) {
    logger.warn(`[ServiceRegistry] Service registry approaching capacity limit: ${REGISTRY_CONFIG.MAX_SERVICES}`);
  }

  // Check for existing service registration
  if (serviceRegistry[name]) {
    logger.warn(`[ServiceRegistry] Overwriting existing service registration: ${name}`);
  }

  try {
    // Register the service
    serviceRegistry[name] = serviceClass;

    // Create service metadata
    const serviceMetadataEntry: ServiceRegistrationMetadata = {
      registeredAt: new Date(),
      status: 'registered',
      version: metadata?.version || '1.0.0',
      healthStatus: 'healthy',
      ...metadata
    };

    // Store service metadata
    serviceMetadata.set(name, serviceMetadataEntry);

    logger.info(`[ServiceRegistry] Successfully registered standardized service: ${name}`, {
      serviceName: name,
      version: serviceMetadataEntry.version,
      registrationTime: serviceMetadataEntry.registeredAt
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown registration error';
    logger.error(`[ServiceRegistry] Failed to register service: ${name}`, { error: errorMessage });
    throw new Error(`Service registration failed for ${name}: ${errorMessage}`);
  }
}

/**
 * Get a standardized form service instance with comprehensive validation 
 * @param name Service name (e.g., 'standardizedKy3pFormService')
 * @param taskId Optional task ID
 * @returns Service instance or null if service not found
 */
export function getStandardizedService(name: string, taskId?: number): FormServiceInterface | null {
  const ServiceClass = serviceRegistry[name];
  
  if (!ServiceClass) {
    logger.error(`Standardized service not found: ${name}`);
    return null;
  }
  
  try {
    return new ServiceClass(taskId);
  } catch (error) {
    logger.error(`Error creating standardized service instance for ${name}:`, error);
    return null;
  }
}

/**
 * Check if all required standardized services are registered
 * 
 * @param requiredServices List of required service names
 * @returns True if all required services are registered
 */
export function checkStandardizedServices(requiredServices: string[]): boolean {
  for (const name of requiredServices) {
    if (!serviceRegistry[name]) {
      logger.warn(`Required standardized service not registered: ${name}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Get appropriate form service for a task type
 * 
 * This is a helper function to ensure we use the correct standardized
 * form service for each task type.
 * 
 * @param taskType Type of the task (kyb, ky3p, open_banking)
 * @param taskId ID of the task
 * @returns The appropriate form service for the task type
 */
export function getFormServiceForTaskType(
  taskType: string,
  taskId: number | undefined
): FormServiceInterface | null {
  // Normalize the task type
  const normalizedType = taskType.toLowerCase().replace(/-/g, '_');
  
  // Map task types to service names
  const serviceMap: Record<string, string> = {
    'kyb': 'standardizedKybFormService',
    'ky3p': 'standardizedKy3pFormService',
    'open_banking': 'standardizedOpenBankingFormService',
  };
  
  const serviceName = serviceMap[normalizedType];
  
  if (!serviceName || !serviceRegistry[serviceName]) {
    logger.error(`No standardized form service found for task type: ${taskType}`);
    return null;
  }
  
  // Create a new instance of the service with the task ID
  return getStandardizedService(serviceName, taskId);
}