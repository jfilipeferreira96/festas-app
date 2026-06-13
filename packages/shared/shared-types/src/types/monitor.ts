// ===================================
// Monitor — Types for monitor management
// ===================================

export interface Monitor {
  id: string;
  nome: string;
  contacto: string;
  activo: boolean;
  userId?: string;
  fotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
