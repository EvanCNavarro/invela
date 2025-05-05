/**
 * Phased Startup Manager
 * 
 * This module provides a structured approach to application initialization,
 * ensuring components are initialized in the proper order and dependencies
 * are satisfied before dependent components are initialized.
 * 
 * OODA Loop Implementation:
 * - Observe: Track initialization state and dependencies
 * - Orient: Organize initialization into phases with clear dependencies
 * - Decide: Determine when to execute each phase based on dependencies
 * - Act: Initialize components in the proper sequence
 */

import getLogger from './standardized-logger';

const logger = getLogger('PhaseStartup');

// Define phases and their dependencies
export type StartupPhase = 
  | 'framework'      // React framework, router, core providers
  | 'context'        // User and company context providers
  | 'services'       // Form services and other business logic services
  | 'communication'  // WebSocket and other communication channels
  | 'ready';         // Application is fully initialized and ready for user interaction

// Phase dependency information
interface PhaseConfig {
  dependencies: StartupPhase[];
  timeout: number; // Milliseconds to wait before timing out
  critical: boolean; // Whether failure of this phase should halt startup
}

// Configure phases with their dependencies and timing
const phaseConfigs: Record<StartupPhase, PhaseConfig> = {
  // Phase 1: React framework, router, core providers
  framework: {
    dependencies: [],
    timeout: 2000,
    critical: true
  },
  
  // Phase 2: User and company context providers
  context: {
    dependencies: ['framework'],
    timeout: 3000,
    critical: true
  },
  
  // Phase 3: Form services and other business logic services
  services: {
    dependencies: ['context'],
    timeout: 3000,
    critical: true
  },
  
  // Phase 4: WebSocket and other communication channels
  communication: {
    dependencies: ['services'],
    timeout: 5000,
    critical: false // App can function without WebSocket initially
  },
  
  // Phase 5: Application is fully initialized and ready
  ready: {
    dependencies: ['framework', 'context', 'services'], // Communication not required
    timeout: 1000,
    critical: true
  }
};

/**
 * KISS singleton implementation of PhaseStartup
 * Simple state tracking with phase callbacks
 */
class PhaseStartup {
  private completedPhases: Set<StartupPhase> = new Set();
  private phaseCallbacks: Record<StartupPhase, Array<() => Promise<void>>> = {
    framework: [],
    context: [],
    services: [],
    communication: [],
    ready: []
  };
  private timers: Record<string, NodeJS.Timeout> = {};
  private initialized = false;
  
  constructor() {
    logger.info('PhaseStartup manager initialized');
  }
  
  /**
   * Register a callback to execute during a specific phase
   * 
   * @param phase The startup phase to execute during
   * @param callback The function to execute
   */
  public registerPhaseCallback(phase: StartupPhase, callback: () => Promise<void>): void {
    logger.info(`Registering callback for phase: ${phase}`);
    this.phaseCallbacks[phase].push(callback);
  }
  
  /**
   * Start the phased startup process
   * 
   * KISS: Simple sequential phase execution with dependency checking
   */
  public async start(): Promise<void> {
    if (this.initialized) {
      logger.warn('PhaseStartup already initialized, ignoring duplicate start');
      return;
    }
    
    this.initialized = true;
    logger.info('Starting phased application initialization');
    
    // Always start with the framework phase
    await this.executePhase('framework');
  }
  
  /**
   * Execute a specific phase and its callbacks
   * 
   * OODA loop clearly visible here:
   * - Observe: Check if dependencies are satisfied
   * - Orient: Determine what needs to be done and timeout handling
   * - Decide: Whether to proceed with phase execution
   * - Act: Execute phase callbacks and trigger dependent phases
   */
  private async executePhase(phase: StartupPhase): Promise<void> {
    logger.info(`Executing startup phase: ${phase}`);
    
    // OODA: Observe - Check if dependencies are satisfied
    const config = phaseConfigs[phase];
    for (const dep of config.dependencies) {
      if (!this.completedPhases.has(dep)) {
        logger.warn(`Cannot execute phase ${phase}, dependency ${dep} not satisfied`);
        return;
      }
    }
    
    // OODA: Orient - Set up a timeout for this phase
    const timeoutId = setTimeout(() => {
      logger.error(`Phase ${phase} timed out after ${config.timeout}ms`);
      if (config.critical) {
        logger.error(`Critical phase ${phase} failed, application may not function correctly`);
      } else {
        // Continue with next phases if non-critical
        this.completedPhases.add(phase);
        this.proceedToNextPhases(phase);
      }
    }, config.timeout);
    
    this.timers[phase] = timeoutId;
    
    try {
      // OODA: Act - Execute all registered callbacks for this phase
      const callbacks = this.phaseCallbacks[phase];
      logger.info(`Executing ${callbacks.length} callbacks for phase ${phase}`);
      
      // Execute callbacks in sequence (not parallel to ensure proper order)
      for (const callback of callbacks) {
        try {
          await callback();
        } catch (error) {
          logger.error(`Error in phase ${phase} callback:`, 
            error instanceof Error ? error.message : String(error));
          if (config.critical) {
            throw error; // Re-throw for critical phases
          }
        }
      }
      
      // Phase completed successfully
      clearTimeout(this.timers[phase]);
      this.completedPhases.add(phase);
      logger.info(`Phase ${phase} completed successfully`);
      
      // Proceed to the next phases that depend on this one
      this.proceedToNextPhases(phase);
    } catch (error) {
      clearTimeout(this.timers[phase]);
      logger.error(`Phase ${phase} failed:`, 
        error instanceof Error ? error.message : String(error));
      
      if (config.critical) {
        logger.error(`Critical phase ${phase} failed, stopping startup process`);
      } else {
        // Continue with next phases if non-critical
        this.completedPhases.add(phase);
        this.proceedToNextPhases(phase);
      }
    }
  }
  
  /**
   * Find and execute the next phases that depend on the completed phase
   * 
   * DRY: Single implementation for determining and executing dependent phases
   */
  private proceedToNextPhases(completedPhase: StartupPhase): void {
    // Find all phases that have this phase as their only unsatisfied dependency
    Object.entries(phaseConfigs).forEach(([phase, config]) => {
      const phaseKey = phase as StartupPhase;
      
      // Skip already completed phases
      if (this.completedPhases.has(phaseKey)) {
        return;
      }
      
      // Check if all dependencies except the just-completed one were already satisfied
      const unsatisfiedDeps = config.dependencies.filter(dep => !this.completedPhases.has(dep));
      
      // If the only unsatisfied dependency was the one we just completed, execute this phase
      if (unsatisfiedDeps.length === 0) {
        logger.info(`Phase ${phaseKey} dependencies satisfied, executing...`);
        this.executePhase(phaseKey);
      }
    });
  }
  
  /**
   * Check if a specific phase has been completed
   */
  public isPhaseComplete(phase: StartupPhase): boolean {
    return this.completedPhases.has(phase);
  }
  
  /**
   * Check if all phases have been completed
   */
  public isStartupComplete(): boolean {
    return this.isPhaseComplete('ready');
  }
}

// Export singleton instance
export const phaseStartup = new PhaseStartup();
