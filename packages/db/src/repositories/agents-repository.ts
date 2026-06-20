import { db, agents, eq } from '../client.js';
import {
  type AgentRow,
  type InsertAgent,
  type RiskLevel,
  type TradingMode,
  type AgentStatus,
} from '../schema/agents.js';

export type { AgentRow, RiskLevel, TradingMode, AgentStatus };

export interface CreateAgentParams {
  id?:          string;       // omit to auto-generate
  userId:       string;
  name:         string;
  riskLevel?:   RiskLevel;
  tradingMode?: TradingMode;
  status?:      AgentStatus;
}

export interface UpdateAgentParams {
  name?:        string;
  riskLevel?:   RiskLevel;
  tradingMode?: TradingMode;
  status?:      AgentStatus;
}

function generateAgentId(): string {
  // Produces a short slug: agent-<8 hex chars>
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `agent-${hex}`;
}

export class AgentsRepository {
  static async create(params: CreateAgentParams): Promise<AgentRow> {
    const now = new Date();
    const row: InsertAgent = {
      id:          params.id          ?? generateAgentId(),
      userId:      params.userId,
      name:        params.name,
      riskLevel:   params.riskLevel   ?? 'BALANCED',
      tradingMode: params.tradingMode ?? 'AUTONOMOUS',
      status:      params.status      ?? 'ACTIVE',
      createdAt:   now,
      updatedAt:   now,
    };

    const [inserted] = await db
      .insert(agents)
      .values(row)
      .returning();

    if (!inserted) throw new Error(`Failed to insert agent id=${row.id}`);
    return inserted;
  }

  static async getById(id: string): Promise<AgentRow | null> {
    const rows = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  static async getByAgentId(agentId: string): Promise<AgentRow | null> {
    return AgentsRepository.getById(agentId);
  }

  static async getByUserId(userId: string): Promise<AgentRow[]> {
    return db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId));
  }

  static async update(id: string, params: UpdateAgentParams): Promise<AgentRow | null> {
    const patch: Partial<InsertAgent> = { updatedAt: new Date() };
    if (params.name        !== undefined) patch.name        = params.name;
    if (params.riskLevel   !== undefined) patch.riskLevel   = params.riskLevel;
    if (params.tradingMode !== undefined) patch.tradingMode = params.tradingMode;
    if (params.status      !== undefined) patch.status      = params.status;

    const [updated] = await db
      .update(agents)
      .set(patch)
      .where(eq(agents.id, id))
      .returning();

    return updated ?? null;
  }
}
