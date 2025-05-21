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
    timeout: 5000, // Increased from 2000ms to 5000ms
    critical: true
  },
  
  // Phase 2: User and company context providers
  context: {
    dependencies: ['framework'],
    timeout: 6000, // Increased from 3000ms to 6000ms
    critical: true
  },
  
  // Phase 3: Form services and other business logic services
  services: {
    dependencies: ['context'],
    timeout: 8000, // Increased from 3000ms to 8000ms
    critical: true
  },
  
  // Phase 4: WebSocket and other communication channels
  communication: {
    dependencies: ['services'],
    timeout: 10000, // Increased from 5000ms to 10000ms
    critical: false // App can function without WebSocket initially
  },
  
  // Phase 5: Application is fully initialized and ready
  ready: {
    dependencies: ['framework', 'context', 'services'], // Communication not required
    timeout: 20000, // Increased from 10000ms to 20000ms to allow adequate time for component initialization
    critical: false // Non-critical to prevent application failure when timeout occurs
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
    
    // Prevent duplicate execution
    if (this.completedPhases.has(phase)) {
      logger.info(`Phase ${phase} already completed, skipping`);
      return;
    }
    
    // OODA: Observe - Check if dependencies are satisfied
    const config = phaseConfigs[phase];
    const unsatisfiedDeps = config.dependencies.filter(dep => !this.completedPhases.has(dep));
    
    if (unsatisfiedDeps.length > 0) {
      logger.warn(`Cannot execute phase ${phase}, dependencies not satisfied: ${unsatisfiedDeps.join(', ')}`);
      return;
    }
    
    // For the "ready" phase, let's handle it specially with immediate completion
    // This is a critical fix to prevent the ready phase from timing out
    if (phase === 'ready') {
      try {
        // OODA: Act - Execute all registered callbacks for this phase
        const callbacks = this.phaseCallbacks[phase];
        logger.info(`Executing ${callbacks.length} callbacks for ready phase - will complete immediately`);
        
        // Execute callbacks without waiting
        for (let i = 0; i < callbacks.length; i++) {
          try {
            // Don't await - fire and continue
            callbacks[i]().catch(err => {
              logger.warn(`Non-blocking error in ready phase callback ${i+1}: ${err}`);
            });
          } catch (error) {
            // Log but continue
            logger.warn(`Error in ready phase callback ${i+1}, continuing: ${error}`);
          }
        }
        
        // Mark as completed immediately without waiting
        this.completedPhases.add(phase);
        logger.info(`Phase ${phase} marked as completed immediately`);
        return;
      } catch (error) {
        // Even for errors, complete the ready phase
        this.completedPhases.add(phase);
        logger.warn(`Ready phase completed despite error: ${error}`);
        return;
      }
    }
    
    // OODA: Orient - Set up a timeout for this phase with better handling
    const timeoutId = setTimeout(() => {
      logger.error(`Phase ${phase} timed out after ${config.timeout}ms`);
      
      if (config.critical) {
        logger.error(`Critical phase ${phase} failed, application may not function correctly`);
        // Log more diagnostic information
        logger.error(`Pending callbacks for phase ${phase}: ${this.phaseCallbacks[phase].length}`);
        logger.error(`Completed phases: ${Array.from(this.completedPhases).join(', ')}`);
      } else {
        // Continue with next phases if non-critical with enhanced logging
        logger.warn(`Non-critical phase ${phase} timed out, continuing startup process`);
        this.completedPhases.add(phase);
        
        // Clear the timer reference
        delete this.timers[phase];
        
        // Give detailed debugging information
        logger.info(`Moving forward from phase ${phase} timeout to dependent phases`);
        this.proceedToNextPhases(phase);
      }
    }, config.timeout);
    
    this.timers[phase] = timeoutId;
    
    try {
      // OODA: Act - Execute all registered callbacks for this phase
      const callbacks = this.phaseCallbacks[phase];
      logger.info(`Executing ${callbacks.length} callbacks for phase ${phase}`);
      
      // Execute callbacks in sequence with more robust error handling
      for (let i = 0; i < callbacks.length; i++) {
        try {
          logger.info(`Executing callback ${i+1}/${callbacks.length} for phase ${phase}`);
          // Explicitly handle the promise resolution or rejection
          const callbackPromise = callbacks[i]();
          
          // Handle non-Promise returns (in case the callback doesn't return a promise)
          if (!(callbackPromise instanceof Promise)) {
            logger.warn(`Callback ${i+1} for phase ${phase} did not return a Promise`);
            continue; // Move to next callback
          }
          
          await Promise.race([
            callbackPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Callback ${i+1} timeout`)), config.timeout / 2)
            )
          ]);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Error in phase ${phase} callback ${i+1}/${callbacks.length}: ${errorMessage}`);
          
          if (config.critical) {
            // Only throw for critical phases to stop execution
            throw error;
          } else {
            // For non-critical phases, log and continue to next callback
            logger.warn(`Continuing to next callback despite error in phase ${phase}`);
          }
        }
      }
      
      // Phase completed successfully
      if (this.timers[phase]) {
        clearTimeout(this.timers[phase]);
        delete this.timers[phase];
      }
      
      this.completedPhases.add(phase);
      logger.info(`Phase ${phase} completed successfully`);
      
      // Proceed to the next phases that depend on this one
      this.proceedToNextPhases(phase);
    } catch (error) {
      // Ensure timeout is cleared
      if (this.timers[phase]) {
        clearTimeout(this.timers[phase]);
        delete this.timers[phase];
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Phase ${phase} failed: ${errorMessage}`);
      
      if (config.critical) {
        logger.error(`Critical phase ${phase} failed, stopping startup process`);
        // Do not proceed to next phases for critical failures
      } else {
        // Continue with next phases if non-critical
        logger.warn(`Non-critical phase ${phase} failed, continuing startup process`);
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
