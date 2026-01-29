import { v4 as uuidv4 } from 'uuid';
import { ChangeRequest, CreateRequestDTO, RequestStatus, TriageAnalysis } from '../types/request';

// In-memory store for the POC
// In production, this would be a database
export class RequestStore {
  private requests: Map<string, ChangeRequest> = new Map();

  create(dto: CreateRequestDTO): ChangeRequest {
    const request: ChangeRequest = {
      id: uuidv4(),
      clientId: dto.clientId,
      modelName: dto.modelName,
      title: dto.title,
      description: dto.description,
      changeType: 'unknown',
      urgency: dto.urgency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      executionLog: [],
    };

    this.requests.set(request.id, request);
    return request;
  }

  get(id: string): ChangeRequest | undefined {
    return this.requests.get(id);
  }

  getAll(): ChangeRequest[] {
    return Array.from(this.requests.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getByStatus(status: RequestStatus): ChangeRequest[] {
    return this.getAll().filter(r => r.status === status);
  }

  getByClient(clientId: string): ChangeRequest[] {
    return this.getAll().filter(r => r.clientId === clientId);
  }

  update(id: string, updates: Partial<ChangeRequest>): ChangeRequest | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;

    const updated = {
      ...request,
      ...updates,
      updatedAt: new Date(),
    };

    this.requests.set(id, updated);
    return updated;
  }

  applyTriageResult(id: string, analysis: TriageAnalysis): ChangeRequest | undefined {
    return this.update(id, {
      changeType: analysis.changeType,
      triageResult: analysis.triageResult,
      status: analysis.triageResult === 'auto_fix' ? 'in_progress' : 'needs_human',
    });
  }

  addLog(
    id: string,
    action: string,
    details: string,
    status: 'success' | 'error' | 'info'
  ): void {
    const request = this.requests.get(id);
    if (request) {
      request.executionLog.push({
        timestamp: new Date(),
        action,
        details,
        status,
      });
      request.updatedAt = new Date();
    }
  }

  setStatus(id: string, status: RequestStatus): void {
    this.update(id, { status });
  }

  setPRUrl(id: string, prUrl: string): void {
    this.update(id, { prUrl, status: 'pr_created' });
  }

  delete(id: string): boolean {
    return this.requests.delete(id);
  }

  clear(): void {
    this.requests.clear();
  }

  // Stats for dashboard
  getStats(): {
    total: number;
    byStatus: Record<RequestStatus, number>;
    autoFixRate: number;
  } {
    const all = this.getAll();
    const byStatus: Record<RequestStatus, number> = {
      pending: 0,
      triaging: 0,
      in_progress: 0,
      testing: 0,
      pr_created: 0,
      completed: 0,
      failed: 0,
      needs_human: 0,
    };

    for (const request of all) {
      byStatus[request.status]++;
    }

    const autoFixed = all.filter(r => r.triageResult === 'auto_fix' && r.status === 'completed').length;
    const totalProcessed = all.filter(r => r.status === 'completed' || r.status === 'failed').length;

    return {
      total: all.length,
      byStatus,
      autoFixRate: totalProcessed > 0 ? autoFixed / totalProcessed : 0,
    };
  }
}
