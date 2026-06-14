# SKILL — Tempo Real

Padrão para funcionalidades que actualizam sem interacção do utilizador.
Usado em: página de Festas, Dashboard (KPIs), Cacifos.

## Estratégia por caso de uso

| Funcionalidade | Estratégia recomendada | Intervalo |
|---|---|---|
| Timer de festa (HH:MM:SS) | `setInterval` local no cliente | 1 segundo |
| Estado dos cacifos | Polling HTTP | 30 segundos |
| KPIs do dashboard | Polling HTTP | 60 segundos |
| Alterações críticas (finalizar festa) | WebSocket ou Server-Sent Events | Instantâneo |

Começar com polling. Migrar para WebSocket apenas se o polling causar problemas
de performance com múltiplos utilizadores simultâneos.

## Timer de festa — implementação

O timer é calculado no cliente a partir da `inicioEm` guardada na reserva (unificada com festa).
Nunca confiar num contador incrementado localmente — pode desfasar.

### Componente CountdownTimer

Existe em `@/components/ui/countdown-timer/CountdownTimer.tsx`. Usar este componente
para todos os countdowns da aplicação.

```tsx
import { CountdownTimer } from '@/components/ui/countdown-timer/CountdownTimer'

<CountdownTimer
  inicioEm={reserva.inicioEm}
  fimPrevisto={reserva.fimPrevisto}
  emAtraso={emAtraso}
/>
```

### Hook useTimer (a implementar se necessário)

```tsx
// hooks/useTimer.ts
import { useState, useEffect } from 'react'

export function useTimer(horaInicio: string, horaFimPrevista: string) {
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const inicio = new Date(horaInicio)
  const fim = new Date(horaFimPrevista)

  const decorrido = agora.getTime() - inicio.getTime()
  const restante = fim.getTime() - agora.getTime()
  const percentagem = Math.min((decorrido / (fim.getTime() - inicio.getTime())) * 100, 100)
  const emAtraso = restante < 0

  return {
    decorrido: formatarDuracao(decorrido),   // "00:45:20"
    restante: formatarDuracao(Math.abs(restante)),
    percentagem,
    emAtraso,
  }
}

function formatarDuracao(ms: number): string {
  const totalSegundos = Math.floor(ms / 1000)
  const horas = Math.floor(totalSegundos / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60
  return [horas, minutos, segundos]
    .map(v => String(v).padStart(2, '0'))
    .join(':')
}
```

## Polling — implementação com TanStack Query

Usar `refetchInterval` do TanStack Query para polling automático:

```tsx
// hooks/use-reservas.ts
import { useQuery } from '@tanstack/react-query'

export function useFestasActivas() {
  return useQuery({
    queryKey: ['reservas', 'em_curso'],
    queryFn: () => api.reservas.list({ estado: 'EM_CURSO' }),
    refetchInterval: 30_000,  // 30 segundos
  })
}

// hooks/use-dashboard.ts
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => api.dashboard.kpis(),
    refetchInterval: 60_000,  // 60 segundos
  })
}
```

## Indicador visual de actualização

Mostrar sempre um indicador subtil de quando foi a última actualização:

```tsx
<span className="text-xs text-muted">
  Actualizado às {format(ultimaActualizacao, 'HH:mm:ss', { locale: pt })}
</span>
```

## Festa em atraso

Quando `emAtraso === true` (tempo restante negativo), o card da festa deve:
- Ter border e fundo em vermelho suave
- Mostrar o timer do atraso em vermelho: "Em atraso: 00:12:30"
- Emitir notificação sonora opcional (configurável nas preferências)

## Finalizar festa — fluxo

1. Utilizador clica "Finalizar Festa"
2. Modal de confirmação: "Tens a certeza que queres finalizar a Festa do Tomás?"
3. Ao confirmar:
   - PATCH `/api/reservas/:id` com `{ estado: 'CONCLUIDA', fimReal: new Date().toISOString() }`
   - Todos os cacifos associados à reserva ficam com estado `LIVRE` automaticamente (lógica no backend)
   - Reserva desaparece da página de Festas em Curso
   - Toast de sucesso: "Festa concluída com sucesso"

## WebSocket (fase futura)

Se implementado, usar uma solução compatível com Next.js como:
- Server-Sent Events (SSE) via Next.js API routes
- Pusher / Ably (serviços externos)
- Socket.io com Next.js custom server (não recomendado)

Para Next.js App Router, SSE é a opção mais simples:

```tsx
// app/api/reservas/stream/route.ts
export async function GET(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Emitir eventos
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    }
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

O cliente subscreve por sala para não receber eventos de outros espaços.
