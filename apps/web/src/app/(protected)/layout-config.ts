/**
 * Flag de configuração para mostrar/ocultar a barra de topo (AppHeader).
 *
 * - `false` (predefinido): usa o botão flutuante MobileSidebarToggle,
 *   liberando espaço vertical no topo. A margem superior (`mt-12`) no
 *   <main> evita sobreposição do botão com o título da página em mobile.
 *
 * - `true`: restaura o AppHeader (barra de topo) com user menu e logout,
 *   substituindo o botão flutuante.
 *
 * Altera este valor para `true` para voltar a ter a barra superior.
 */
export const SHOW_TOP_BAR = false;
