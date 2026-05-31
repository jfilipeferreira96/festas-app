# SKILL — Formulários

Padrão obrigatório para todos os formulários da aplicação.

## Stack

- `react-hook-form` para gestão de estado do formulário
- `zod` para validação de schema
- Mensagens de erro sempre em PT-PT
- Usar componentes de `@/components/form/` e `@/components/ui/`

## Componentes de formulário disponíveis

| Componente | Path | Uso |
|---|---|---|
| `Form` | `@/components/form/Form` | Contentor base (substitui `<form>` directamente) |
| `InputField` | `@/components/form/input/InputField` | Campo de texto simples |
| `TextArea` | `@/components/form/input/TextArea` | Campo de texto longo (notas, observações) |
| `Checkbox` | `@/components/form/input/Checkbox` | Checkbox |
| `Select` | `@/components/form/Select` | Dropdown de opções |
| `MultiSelect` | `@/components/form/MultiSelect` | Seleção múltipla (extras, módulos, etc.) |
| `Switch` | `@/components/form/switch/Switch` | Toggle Sim / Não para campos booleanos |
| `DatePicker` | `@/components/form/date-picker` | Selector de data em PT-PT (DD/MM/AAAA) |
| `Label` | `@/components/form/Label` | Label para campos |
| `PhoneInput` | `@/components/form/group-input/PhoneInput` | Input de telefone PT |

## Outros componentes UI relacionados

| Componente | Path | Uso |
|---|---|---|
| `Input` | `@/components/ui/input` | Input base (usado com `register` do RHF) |
| `Textarea` | `@/components/ui/textarea` | Textarea base |
| `Button` | `@/components/ui/button/Button` | Botões (primário, secundário, ghost, destructive) |
| `ProfilePhotoUpload` | `@/components/ui/ProfilePhotoUpload` | Upload de foto de perfil |
| `QuantityStepper` | `@/components/ui/quantity-stepper/QuantityStepper` | Botões − e + para quantidades |
| `FoodIconPicker` | `@/components/ui/FoodIconPicker` | Selecção de ícone para items de menu |
| `StatusStepper` | `@/components/ui/status-stepper/StatusStepper` | Stepper de estado da reserva |

## Estrutura base de um formulário

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/form/Select'
import { Button } from '@/components/ui/button/Button'

const schema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Introduza um endereço de email válido'),
})

type FormData = z.infer<typeof schema>

export function ExemploForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = (data: FormData) => {
    // chamar API via hook useMutation
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Nome</label>
        <Input
          {...register('nome')}
          placeholder="Nome do aniversariante"
          error={!!errors.nome}
          hint={errors.nome?.message}
        />
      </div>
      <Button type="submit">Guardar</Button>
    </form>
  )
}
```

## Validações obrigatórias por tipo de campo

```ts
// Nome (pessoa)
z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100)

// Telefone português
z.string().regex(/^(9[1236]\d{7}|2\d{8})$/, 'Introduza um número de telefone válido')

// Email
z.string().email('Introduza um endereço de email válido')

// Data (string ISO)
z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')

// Hora
z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida')

// Número positivo
z.number().min(1, 'O valor deve ser maior que zero')

// Campo obrigatório (select)
z.string().min(1, 'Este campo é obrigatório')
```

## Mensagens de erro — regras PT-PT

- Sempre começar com maiúscula
- Nunca usar "Por favor" — é redundante
- Usar linguagem directa: "Introduza", "Seleccione", "O campo X é obrigatório"
- Nunca deixar a mensagem de erro em inglês (erro do Zod por defeito)

```ts
// ERRADO
z.string().min(1) // mensagem: "String must contain at least 1 character(s)"

// CORRECTO
z.string().min(1, 'Este campo é obrigatório')
```

## Estados do formulário

| Estado | Comportamento |
|---|---|
| Idle | Formulário limpo, pronto para preenchimento |
| Dirty | Utilizador alterou pelo menos um campo — pedir confirmação antes de fechar |
| Submitting | Botão de guardar com spinner, campos desactivados |
| Success | Toast de confirmação, fechar modal ou redirecionar |
| Error | Mostrar mensagem de erro da API no topo do formulário |

## Formulário em modo leitura (read-only)

Quando o registo não pode ser editado (ex: festa em curso, menu após início), desactivar os campos:

```tsx
<Input {...register('nome')} disabled readOnly />
```

Os campos ficam com background acinzentado e cursor `default`.

## Confirmação antes de fechar

Se o formulário estiver "dirty" (alterado mas não guardado), mostrar sempre diálogo de confirmação:

> "Tens alterações não guardadas. Tens a certeza que queres sair?"
> [Descartar alterações] [Continuar a editar]