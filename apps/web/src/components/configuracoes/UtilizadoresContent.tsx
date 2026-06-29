"use client";

import { useState, useMemo, useCallback } from "react";
import { useUtilizadores } from "@/hooks/use-utilizadores";
import { useUser } from "@/contexts/AuthContext";
import type { FuncaoUtilizador, Utilizador } from "@saas/shared-types";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Shield, UserCheck, UserX, KeyRound } from "lucide-react";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import ProfilePhotoUpload from "@/components/ui/ProfilePhotoUpload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const SERVER_URL = ""; // Single-app: API/uploads served same-origin via Next.js Route Handlers

// --- Zod Schemas ---
const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  funcao: z.string().min(1, "Seleccione uma função"),
});

const editUserSchema = z.object({
  funcao: z.string().min(1, "Seleccione uma função"),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

// --- Constants ---
// Design tokens (see apps/web/src/app/globals.css @theme directive):
//   accent-purple-* → ADMINISTRADOR
//   accent-green-*  → LANCHE
//   accent-orange-* → CACIFOS
const roleColors: Record<FuncaoUtilizador, string> = {
  ADMINISTRADOR: "bg-accent-purple-50 text-accent-purple-700",
  LANCHE: "bg-accent-green-50 text-accent-green-700",
  CACIFOS: "bg-accent-orange-50 text-accent-orange-700",
  MONITOR: "bg-accent-blue-50 text-accent-blue-700",
  FESTAS_ACABAR: "bg-accent-red-50 text-accent-red-700",
  STAFF: "bg-accent-teal-50 text-accent-teal-700",
  RECECAO: "bg-primary-50 text-primary-700",
};

const roleLabels: Record<FuncaoUtilizador, string> = {
  ADMINISTRADOR: "Administrador",
  LANCHE: "Lanche",
  CACIFOS: "Cacifos",
  MONITOR: "Monitor",
  FESTAS_ACABAR: "Festas a Acabar",
  STAFF: "Staff",
  RECECAO: "Receção",
};

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

interface UtilizadoresContentProps {
  isCreateModalOpen?: boolean;
  setIsCreateModalOpen?: (open: boolean) => void;
}

export default function UtilizadoresContent({
  isCreateModalOpen: externalIsCreateModalOpen,
  setIsCreateModalOpen: externalSetIsCreateModalOpen,
}: UtilizadoresContentProps = {}) {
  const {
    utilizadores,
    isLoading,
    createUtilizador,
    isCreating,
    updateFuncao,
    isUpdatingFuncao,
    updateActivo,
    isUpdatingActivo,
    updatePassword,
    isUpdatingPassword,
    deleteUtilizador,
    isDeleting,
  } = useUtilizadores();

  const { user: currentUser } = useUser();

  const [internalIsCreateModalOpen, setInternalIsCreateModalOpen] = useState(false);
  const isCreateModalOpen = externalIsCreateModalOpen ?? internalIsCreateModalOpen;
  const setIsCreateModalOpen = externalSetIsCreateModalOpen ?? setInternalIsCreateModalOpen;
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: "",
    userName: "",
  });
  const [editUser, setEditUser] = useState<Utilizador | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Pending photo file for create flow
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  // --- Create Form ---
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    setValue: setCreateValue,
    reset: resetCreateForm,
    formState: { errors: createErrors, isSubmitting: isCreateSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      funcao: "",
    },
  });

  // --- Edit Form ---
  const {
    setValue: setEditValue,
    watch: watchEdit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      funcao: "",
    },
  });

  const editFuncao = watchEdit("funcao");

  const canEditUser = useCallback(
    (user: Utilizador) => user.id !== currentUser?.id,
    [currentUser?.id]
  );

  /** Upload a pending photo file after entity creation */
  const uploadPendingPhoto = useCallback(async (entityId: string, file: File, endpoint: string) => {
    const formData = new FormData();
    formData.append("photo", file);
    try {
      await fetch(`${SERVER_URL}${endpoint.replace(":id", entityId)}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
    } catch {
      // Silently fail — photo is optional, entity was already created
    }
  }, []);

  const handleCreateUser = useCallback(
    async (data: CreateUserFormData) => {
      const newUser = await createUtilizador({ ...data, funcao: data.funcao as FuncaoUtilizador });

      // Upload pending photo if one was selected
      if (pendingPhotoFile && newUser?.id) {
        await uploadPendingPhoto(newUser.id, pendingPhotoFile, "/api/upload/user/:id");
      }

      setIsCreateModalOpen(false);
      resetCreateForm();
      setPendingPhotoFile(null);
    },
    [createUtilizador, setIsCreateModalOpen, resetCreateForm, pendingPhotoFile, uploadPendingPhoto]
  );

  const handleRoleChange = useCallback(
    async (userId: string, funcao: FuncaoUtilizador) => {
      await updateFuncao({ id: userId, funcao });
    },
    [updateFuncao]
  );

  const handleToggleActive = useCallback(
    async (userId: string, activo: boolean) => {
      await updateActivo({ id: userId, activo });
    },
    [updateActivo]
  );

  const handleChangePassword = useCallback(
    async (userId: string, password: string) => {
      setPasswordSuccess(false);
      await updatePassword({ id: userId, password });
      setNewPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    [updatePassword]
  );

  const handleDeleteClick = useCallback(
    (user: Utilizador) => {
      if (!canEditUser(user)) return;
      setDeleteModal({ isOpen: true, userId: user.id, userName: user.name });
    },
    [canEditUser]
  );

  const handleDeleteUser = useCallback(async () => {
    await deleteUtilizador(deleteModal.userId);
    setDeleteModal({ isOpen: false, userId: "", userName: "" });
  }, [deleteUtilizador, deleteModal.userId]);

  const handleOpenEdit = useCallback(
    (user: Utilizador) => {
      setEditUser(user);
      setNewPassword("");
      setPasswordSuccess(false);
      resetEditForm({ funcao: user.funcao });
    },
    [resetEditForm]
  );

  const handleOpenCreate = useCallback(() => {
    resetCreateForm({ name: "", email: "", password: "", funcao: "" });
    setPendingPhotoFile(null);
    setIsCreateModalOpen(true);
  }, [resetCreateForm, setIsCreateModalOpen]);

  const columns: Column<Utilizador>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Utilizador",
        sortable: true,
        render: (_value, user) => (
          <div className="flex items-center">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-medium text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="ml-4">
              <div className="text-sm font-medium text-text-primary">{user.name}</div>
              <div className="text-sm text-text-muted">{user.email}</div>
              {user.id === currentUser?.id && (
                <span className="inline-flex items-center text-xs text-brand-500 mt-1">
                  <Shield className="w-3 h-3 mr-1" />
                  Você
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "funcao",
        label: "Função",
        sortable: true,
        render: (_value, user) =>
          canEditUser(user) ? (
            <Select
              options={roleOptions}
              value={user.funcao}
              onChange={(value) => handleRoleChange(user.id, value as FuncaoUtilizador)}
              className="h-9 text-sm"
            />
          ) : (
            <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${roleColors[user.funcao]}`}>
              {roleLabels[user.funcao]}
            </span>
          ),
      },
      {
        key: "activo",
        label: "Estado",
        sortable: true,
        render: (_value, user) =>
          canEditUser(user) ? (
            <button
              onClick={() => handleToggleActive(user.id, !user.activo)}
              disabled={isUpdatingActivo}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
                user.activo
                  ? "bg-accent-green-50 text-accent-green-700 hover:bg-accent-green-100"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {user.activo ? (
                <>
                  <UserCheck className="w-3 h-3" /> Activo
                </>
              ) : (
                <>
                  <UserX className="w-3 h-3" /> Inactivo
                </>
              )}
            </button>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                user.activo
                  ? "bg-accent-green-50 text-accent-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {user.activo ? (
                <>
                  <UserCheck className="w-3 h-3" /> Activo
                </>
              ) : (
                <>
                  <UserX className="w-3 h-3" /> Inactivo
                </>
              )}
            </span>
          ),
      },
      {
        key: "createdAt",
        label: "Criado em",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-text-muted">
            {format(new Date(value as string), "dd MMM yyyy", { locale: pt })}
          </span>
        ),
      },
    ],
    [currentUser?.id, canEditUser, isUpdatingActivo]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {!externalSetIsCreateModalOpen && (
          <Button onClick={handleOpenCreate} startIcon={<Plus className="w-4 h-4" />}>
            Novo Utilizador
          </Button>
        )}
      </div>

      {/* DataTable */}
      <DataTable<Utilizador>
        data={utilizadores || []}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Pesquisar por nome, email ou função..."
        searchableFields={["name", "email"]}
        itemLabel="utilizadores"
        pagination
        pageSize={10}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteClick}
        canManage={true}
        emptyState={{
          title: "Nenhum utilizador encontrado",
          description: "Comece por criar o primeiro utilizador.",
          action: (
            <Button onClick={handleOpenCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Criar utilizador
            </Button>
          ),
        }}
      />

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Editar Utilizador</h2>
          {editUser && (
            <div className="space-y-4">
              {/* Profile Photo Section */}
              <div>
                <h4 className="mb-4 text-sm font-medium text-text-primary">Alterar Foto de Perfil</h4>
                <div className="mb-4 flex max-w-sm items-center gap-5">
                  <ProfilePhotoUpload
                    currentPhotoUrl={editUser.image}
                    name={editUser.name}
                    uploadEndpoint={`/api/upload/user/${editUser.id}`}
                    size={80}
                    onUploadSuccess={(imageUrl) => {
                      setEditUser({ ...editUser, image: imageUrl });
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <p className="text-sm text-text-primary">{editUser.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
                <p className="text-sm text-text-primary">{editUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Função</label>
                <Select
                  options={roleOptions}
                  value={editFuncao}
                  onChange={(value) => {
                    setEditValue("funcao", value);
                    handleRoleChange(editUser.id, value as FuncaoUtilizador);
                    setEditUser({ ...editUser, funcao: value as FuncaoUtilizador });
                  }}
                  placeholder="Seleccione uma função"
                />
                {editErrors.funcao && (
                  <p className="mt-1 text-xs text-accent-red">{editErrors.funcao.message}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Estado</label>
                <button
                  onClick={() => {
                    handleToggleActive(editUser.id, !editUser.activo);
                    setEditUser({ ...editUser, activo: !editUser.activo });
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
                    editUser.activo
                      ? "bg-accent-green-50 text-accent-green-700 hover:bg-accent-green-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {editUser.activo ? (
                    <><UserCheck className="w-3 h-3" /> Activo</>
                  ) : (
                    <><UserX className="w-3 h-3" /> Inactivo</>
                  )}
                </button>
              </div>

              {/* Password Change Section (admin-only, not for self) */}
              {canEditUser(editUser) && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-text-secondary" />
                    <label className="block text-sm font-medium text-text-primary">
                      Nova Palavra-passe
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <InputField
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordSuccess(false);
                      }}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!newPassword || newPassword.length < 8 || isUpdatingPassword}
                      onClick={() => handleChangePassword(editUser.id, newPassword)}
                      className="shrink-0"
                    >
                      {isUpdatingPassword ? "..." : "Alterar"}
                    </Button>
                  </div>
                  {newPassword && newPassword.length < 8 && (
                    <p className="mt-1 text-xs text-accent-red">A password deve ter pelo menos 8 caracteres</p>
                  )}
                  {passwordSuccess && (
                    <p className="mt-1 text-xs text-accent-green-700">Password atualizada com sucesso</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button variant="outline" onClick={() => setEditUser(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Novo Utilizador</h2>
          <form onSubmit={handleCreateSubmit(handleCreateUser)} className="space-y-4">
            {/* Profile Photo Section */}
            <div>
              <h4 className="mb-4 text-sm font-medium text-text-primary">Foto de Perfil</h4>
              <div className="mb-4 flex max-w-sm items-center gap-5">
                <ProfilePhotoUpload
                  name={registerCreate("name").name ? "U" : "U"}
                  size={80}
                  onFileSelect={(file) => setPendingPhotoFile(file)}
                  pendingFile={pendingPhotoFile}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
              <InputField
                type="text"
                {...registerCreate("name")}
                placeholder="Nome do utilizador"
                error={!!createErrors.name}
                hint={createErrors.name?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <InputField
                type="email"
                {...registerCreate("email")}
                placeholder="email@exemplo.com"
                error={!!createErrors.email}
                hint={createErrors.email?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Palavra-passe</label>
              <InputField
                type="password"
                {...registerCreate("password")}
                placeholder="Mínimo 8 caracteres"
                error={!!createErrors.password}
                hint={createErrors.password?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Função</label>
              <Select
                options={roleOptions}
                placeholder="Seleccione uma função"
                onChange={(value) => setCreateValue("funcao", value)}
              />
              {createErrors.funcao && (
                <p className="mt-1 text-xs text-accent-red">{createErrors.funcao.message}</p>
              )}
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreateSubmitting}>
                {isCreateSubmitting ? "A criar..." : "Criar Utilizador"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, userId: "", userName: "" })} className="max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-red-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-accent-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Eliminar Utilizador</h2>
              <p className="text-sm text-text-muted">Esta ação não pode ser revertida</p>
            </div>
          </div>
          <p className="text-sm text-text-primary mb-6">
            Tem a certeza que deseja eliminar o utilizador <strong>{deleteModal.userName}</strong>?
          </p>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, userId: "", userName: "" })}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? "A eliminar..." : "Eliminar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
