import { logger } from './logger';
import { broadcast } from './unified-websocket';
import { db } from '@db';
import { companies, tasks, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';

const broadcastLogger = logger.child({ module: 'WebSocketDataBroadcaster' });

/**
 * Broadcast initial data to a newly connected client
 */
export async function broadcastInitialData(userId: number, companyId: number, clientId: string) {
  try {
    broadcastLogger.info('Broadcasting initial data', { userId, companyId, clientId });

    // Fetch user's company data
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });

    // Fetch user's tasks
    const userTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.company_id, companyId)
      )
    });

    // Fetch user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!company || !user) {
      broadcastLogger.error('Missing required data for initial broadcast', { userId, companyId });
      return;
    }

    // Determine available tabs based on company's onboarding status
    const availableTabs = [];
    if (company.onboarding_company_completed) {
      availableTabs.push('file-vault');
    }
    availableTabs.push('task-center'); // Always available

    // Send initial data payload
    broadcast('initial_data', {
      company: {
        id: company.id,
        name: company.name,
        available_tabs: availableTabs,
        onboarding_company_completed: company.onboarding_company_completed || false,
        risk_score: company.risk_score,
        chosen_score: company.chosen_score,
        category: company.category,
        is_demo: company.is_demo || false
      },
      tasks: userTasks,
      user: {
        id: user.id,
        email: user.email,
        company_id: user.company_id
      }
    }, (client) => client.userId === userId && client.companyId === companyId);

    broadcastLogger.info('Initial data broadcast completed', { userId, companyId });

  } catch (error) {
    broadcastLogger.error('Failed to broadcast initial data', { error, userId, companyId });
  }
}

/**
 * Broadcast company data changes to all clients of that company
 */
export async function broadcastCompanyUpdate(companyId: number) {
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });

    if (!company) {
      broadcastLogger.error('Company not found for broadcast', { companyId });
      return;
    }

    // Determine available tabs based on company's onboarding status
    const availableTabs = [];
    if (company.onboarding_company_completed) {
      availableTabs.push('file-vault');
    }
    availableTabs.push('task-center'); // Always available

    broadcast('company_data', {
      id: company.id,
      name: company.name,
      available_tabs: availableTabs,
      onboarding_company_completed: company.onboarding_company_completed || false,
      risk_score: company.risk_score,
      chosen_score: company.chosen_score,
      category: company.category,
      is_demo: company.is_demo || false
    }, (client) => client.companyId === companyId);

    broadcastLogger.info('Company data broadcast completed', { companyId });

  } catch (error) {
    broadcastLogger.error('Failed to broadcast company update', { error, companyId });
  }
}

/**
 * Broadcast task data changes to all clients of that company
 */
export async function broadcastTaskUpdate(companyId: number, taskId?: number) {
  try {
    const userTasks = await db.query.tasks.findMany({
      where: taskId 
        ? and(eq(tasks.id, taskId), eq(tasks.company_id, companyId))
        : eq(tasks.company_id, companyId)
    });

    broadcast('task_data', userTasks, (client) => client.companyId === companyId);

    broadcastLogger.info('Task data broadcast completed', { companyId, taskId });

  } catch (error) {
    broadcastLogger.error('Failed to broadcast task update', { error, companyId, taskId });
  }
}