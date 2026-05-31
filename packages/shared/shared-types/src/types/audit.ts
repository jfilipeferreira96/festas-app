// ===================================
// Audit — Types for audit log
// ===================================

export interface AuditLog {
  id: string;
  accao: string;
  detalhes?: Record<string, unknown>;
  userId: string;
  createdAt: string;
}
