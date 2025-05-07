/**
 * File Generator Service
 * 
 * This service provides functions for generating various report files
 * based on form data. It supports all form types and ensures consistent
 * file generation across the application.
 * 
 * Features:
 * - Support for multiple form types (KYB, KY3P, Open Banking, Card)
 * - Transaction-aware file generation
 * - Detailed logging for diagnosis
 * - Integration with form data retrieval services
 */

import { PoolClient } from 'pg';
import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as transactionManager from './transaction-manager';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'FileGenerator' });

/**
 * Get task information needed for file generation
 * 
 * @param taskId The task ID to get information for
 * @param transaction Optional transaction client
 * @returns Task information object or null if task not found
 */
export async function getTaskInfo(
  taskId: number,
  transaction?: PoolClient
): Promise<{ 
  taskId: number;
  title: string;
  companyId: number;
  companyName: string;
  taskType: string;
  status: string;
} | null> {
  try {
    moduleLogger.debug(`Getting task info for task ${taskId}`);
    
    const dbClient = transaction ? db.withTransaction(transaction) : db;
    
    // Get task data
    const taskData = await dbClient.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData) {
      moduleLogger.warn(`Task ${taskId} not found`);
      return null;
    }
    
    // Normalize task type
    let taskType = taskData.task_type.toLowerCase();
    
    // Map task types to standard form types
    if (taskType.includes('kyb') || taskType === 'company_kyb') {
      taskType = 'kyb';
    } else if (taskType.includes('ky3p') || taskType === 'security_assessment' || taskType === 'security') {
      taskType = 'ky3p';
    } else if (taskType.includes('open_banking')) {
      taskType = 'open_banking';
    } else if (taskType.includes('card')) {
      taskType = 'card';
    }
    
    // Extract company information from task metadata
    const companyId = taskData.company_id || 0;
    let companyName = 'Unknown Company';
    
    if (taskData.metadata?.companyName) {
      companyName = taskData.metadata.companyName;
    } else if (taskData.metadata?.company?.name) {
      companyName = taskData.metadata.company.name;
    }
    
    return {
      taskId: taskData.id,
      title: taskData.title || `Task ${taskData.id}`,
      companyId,
      companyName,
      taskType,
      status: taskData.status
    };
  } catch (error) {
    moduleLogger.error(`Error getting task info for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
}

/**
 * Generate a file for a task based on its type
 * 
 * @param taskId The task ID to generate a file for
 * @param taskType The task type (form type)
 * @param transaction Optional transaction client
 * @returns Object containing generation result
 */
export async function generateFileForTask(
  taskId: number,
  taskType: string,
  transaction?: PoolClient
): Promise<{
  success: boolean;
  fileId?: number;
  fileName?: string;
  error?: string;
}> {
  const startTime = Date.now();
  const trx = transaction || (await transactionManager.startTransaction());
  
  try {
    // Get task information
    const taskInfo = await getTaskInfo(taskId, trx);
    
    if (!taskInfo) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    moduleLogger.info(`Generating file for task ${taskId} (${taskType})`, {
      taskId,
      taskType,
      companyId: taskInfo.companyId,
      companyName: taskInfo.companyName,
      timestamp: new Date().toISOString()
    });
    
    // Prepare file data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${taskInfo.companyName}_${taskType}_report_${timestamp}.json`;
    
    // Generate file content based on task type
    let fileContent: any;
    
    switch (taskType) {
      case 'kyb':
        fileContent = await generateKybFileContent(taskId, trx);
        break;
      case 'ky3p':
        fileContent = await generateKy3pFileContent(taskId, trx);
        break;
      case 'open_banking':
        fileContent = await generateOpenBankingFileContent(taskId, trx);
        break;
      case 'card':
        fileContent = await generateCardFileContent(taskId, trx);
        break;
      default:
        fileContent = await generateGenericFileContent(taskId, trx);
    }
    
    // Ensure we have a temp directory for files
    const tempDir = path.resolve('./uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write file to disk
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));
    
    // Create file record in database
    const dbClient = trx ? db.withTransaction(trx) : db;
    
    const [fileRecord] = await dbClient.insert(files).values({
      name: fileName,
      original_name: fileName,
      path: filePath,
      size: fs.statSync(filePath).size,
      type: 'application/json',
      company_id: taskInfo.companyId,
      status: 'active',
      metadata: {
        taskId,
        taskType,
        generatedAt: new Date().toISOString(),
        companyName: taskInfo.companyName
      }
    }).returning();
    
    if (!transaction) {
      await transactionManager.commitTransaction(trx);
    }
    
    const duration = Date.now() - startTime;
    moduleLogger.info(`File generated successfully for task ${taskId}`, {
      taskId,
      taskType,
      fileId: fileRecord.id,
      fileName,
      size: fileRecord.size,
      durationMs: duration
    });
    
    return {
      success: true,
      fileId: fileRecord.id,
      fileName
    };
  } catch (error) {
    if (!transaction) {
      await transactionManager.rollbackTransaction(trx);
    }
    
    moduleLogger.error(`Error generating file for task ${taskId}`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Generate KYB file content
 */
async function generateKybFileContent(taskId: number, transaction?: PoolClient): Promise<any> {
  moduleLogger.debug(`Generating KYB file content for task ${taskId}`);
  
  // Get task data
  const taskInfo = await getTaskInfo(taskId, transaction);
  
  if (!taskInfo) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // Get KYB responses from database
  const dbClient = transaction ? db.withTransaction(transaction) : db;
  
  // Query for KYB responses - simplified for mock implementation
  // In a real implementation, you would query the actual responses table
  
  return {
    taskId,
    type: 'kyb',
    title: taskInfo.title,
    companyName: taskInfo.companyName,
    status: taskInfo.status,
    generatedAt: new Date().toISOString(),
    data: {
      // Mock data - in a real implementation this would be the actual form data
      company_details: {
        name: taskInfo.companyName,
        registration_number: `REG-${Math.floor(10000 + Math.random() * 90000)}`,
        jurisdiction: "United States",
        date_incorporated: "2020-01-01"
      },
      risk_assessment: {
        overall_score: Math.floor(Math.random() * 100),
        risk_level: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
        categories: {
          financial: Math.floor(Math.random() * 100),
          operational: Math.floor(Math.random() * 100),
          regulatory: Math.floor(Math.random() * 100),
          reputational: Math.floor(Math.random() * 100)
        }
      }
    }
  };
}

/**
 * Generate KY3P file content
 */
async function generateKy3pFileContent(taskId: number, transaction?: PoolClient): Promise<any> {
  moduleLogger.debug(`Generating KY3P file content for task ${taskId}`);
  
  // Get task data
  const taskInfo = await getTaskInfo(taskId, transaction);
  
  if (!taskInfo) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return {
    taskId,
    type: 'ky3p',
    title: taskInfo.title,
    companyName: taskInfo.companyName,
    status: taskInfo.status,
    generatedAt: new Date().toISOString(),
    data: {
      // Mock data - in a real implementation this would be actual form data
      vendor_details: {
        name: taskInfo.companyName,
        vendor_id: `VID-${Math.floor(10000 + Math.random() * 90000)}`,
        country: "United States",
        industry: "Technology"
      },
      assessment: {
        overall_score: Math.floor(Math.random() * 100),
        risk_level: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
        categories: {
          information_security: Math.floor(Math.random() * 100),
          business_continuity: Math.floor(Math.random() * 100),
          financial_stability: Math.floor(Math.random() * 100),
          compliance: Math.floor(Math.random() * 100)
        }
      }
    }
  };
}

/**
 * Generate Open Banking file content
 */
async function generateOpenBankingFileContent(taskId: number, transaction?: PoolClient): Promise<any> {
  moduleLogger.debug(`Generating Open Banking file content for task ${taskId}`);
  
  // Get task data
  const taskInfo = await getTaskInfo(taskId, transaction);
  
  if (!taskInfo) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return {
    taskId,
    type: 'open_banking',
    title: taskInfo.title,
    companyName: taskInfo.companyName,
    status: taskInfo.status,
    generatedAt: new Date().toISOString(),
    data: {
      // Mock data - in a real implementation this would be actual form data
      institution_details: {
        name: taskInfo.companyName,
        institution_id: `OB-${Math.floor(10000 + Math.random() * 90000)}`,
        country: "United Kingdom",
        license_type: "Full Banking License"
      },
      api_compliance: {
        overall_score: Math.floor(Math.random() * 100),
        compliance_level: ["Non-Compliant", "Partially Compliant", "Fully Compliant"][Math.floor(Math.random() * 3)],
        categories: {
          security: Math.floor(Math.random() * 100),
          api_performance: Math.floor(Math.random() * 100),
          standards_conformance: Math.floor(Math.random() * 100),
          customer_experience: Math.floor(Math.random() * 100)
        }
      }
    }
  };
}

/**
 * Generate Card file content
 */
async function generateCardFileContent(taskId: number, transaction?: PoolClient): Promise<any> {
  moduleLogger.debug(`Generating Card file content for task ${taskId}`);
  
  // Get task data
  const taskInfo = await getTaskInfo(taskId, transaction);
  
  if (!taskInfo) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return {
    taskId,
    type: 'card',
    title: taskInfo.title,
    companyName: taskInfo.companyName,
    status: taskInfo.status,
    generatedAt: new Date().toISOString(),
    data: {
      // Mock data - in a real implementation this would be actual form data
      issuer_details: {
        name: taskInfo.companyName,
        issuer_id: `CID-${Math.floor(10000 + Math.random() * 90000)}`,
        country: "United States",
        issuer_type: "Bank"
      },
      card_program: {
        overall_score: Math.floor(Math.random() * 100),
        risk_level: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
        categories: {
          fraud_controls: Math.floor(Math.random() * 100),
          compliance: Math.floor(Math.random() * 100),
          operational_resilience: Math.floor(Math.random() * 100),
          customer_protections: Math.floor(Math.random() * 100)
        }
      }
    }
  };
}

/**
 * Generate generic file content for any task type
 */
async function generateGenericFileContent(taskId: number, transaction?: PoolClient): Promise<any> {
  moduleLogger.debug(`Generating generic file content for task ${taskId}`);
  
  // Get task data
  const taskInfo = await getTaskInfo(taskId, transaction);
  
  if (!taskInfo) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return {
    taskId,
    type: taskInfo.taskType,
    title: taskInfo.title,
    companyName: taskInfo.companyName,
    status: taskInfo.status,
    generatedAt: new Date().toISOString(),
    data: {
      note: `This is a generic report file for task type: ${taskInfo.taskType}`,
      task_details: {
        id: taskId,
        title: taskInfo.title,
        company: taskInfo.companyName,
        created_at: new Date().toISOString()
      }
    }
  };
}