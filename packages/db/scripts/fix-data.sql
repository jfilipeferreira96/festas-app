-- Sanitize stale data before schema push.
-- Prisma db push fails with "Data truncated" when existing column data
-- references enum values that no longer exist in the new schema.
-- This file is executed by db.js (cleanStaleEnums / sanitizeData step).

-- FuncaoUtilizador: old values GESTOR, RECECAO, MARKETING → ADMINISTRADOR
UPDATE `user` SET funcao = 'ADMINISTRADOR' WHERE funcao NOT IN ('ADMINISTRADOR', 'LANCHE', 'CACIFOS', 'MONITOR', 'FESTAS_ACABAR');
