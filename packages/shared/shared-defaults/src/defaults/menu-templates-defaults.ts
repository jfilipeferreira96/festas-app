// ===================================
// Defaults — Menu templates pré-definidos
// ===================================

export interface MenuTemplateDefault {
  nome: string;
  descricao?: string;
  itens: {
    extraNome: string; // Reference by name — must match Extra.nome in DB
    quantidade: number;
    precoUnitario: number; // in euros (not cents)
  }[];
}

export const MENU_TEMPLATE_DEFAULTS: MenuTemplateDefault[] = [
  {
    nome: "Menu Pizza",
    descricao: "Menu clássico com pizzas, sumos e bolo de aniversário",
    itens: [
      { extraNome: "Pizzas", quantidade: 2, precoUnitario: 0 },
      { extraNome: "Sumos", quantidade: 5, precoUnitario: 0 },
      { extraNome: "Pipocas", quantidade: 1, precoUnitario: 0 },
      { extraNome: "Bolo de Aniversário", quantidade: 1, precoUnitario: 0 },
    ],
  },
  {
    nome: "Menu Bolos",
    descricao: "Menu doce com bolo, cupcakes e sumos",
    itens: [
      { extraNome: "Bolo de Aniversário", quantidade: 1, precoUnitario: 0 },
      { extraNome: "Sumos", quantidade: 5, precoUnitario: 0 },
      { extraNome: "Croissants", quantidade: 10, precoUnitario: 0 },
      { extraNome: "Gelatina", quantidade: 10, precoUnitario: 0 },
    ],
  },
  {
    nome: "Menu Básico",
    descricao: "Menu simples com sandes, sumos e pipocas",
    itens: [
      { extraNome: "Sandes", quantidade: 10, precoUnitario: 0 },
      { extraNome: "Sumos", quantidade: 5, precoUnitario: 0 },
      { extraNome: "Pipocas", quantidade: 2, precoUnitario: 0 },
      { extraNome: "Bolo de Aniversário", quantidade: 1, precoUnitario: 0 },
    ],
  },
  {
    nome: "Menu Premium",
    descricao: "Menu completo com todos os extras de lanche incluídos",
    itens: [
      { extraNome: "Bolo de Aniversário", quantidade: 1, precoUnitario: 0 },
      { extraNome: "Pizzas", quantidade: 3, precoUnitario: 0 },
      { extraNome: "Nuggets", quantidade: 20, precoUnitario: 0 },
      { extraNome: "Pipocas", quantidade: 3, precoUnitario: 0 },
      { extraNome: "Sumos", quantidade: 10, precoUnitario: 0 },
      { extraNome: "Croissants", quantidade: 10, precoUnitario: 0 },
      { extraNome: "Fruta", quantidade: 5, precoUnitario: 0 },
    ],
  },
];
