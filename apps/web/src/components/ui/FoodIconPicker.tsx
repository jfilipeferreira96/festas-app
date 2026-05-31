"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";

// All available food icons (100px versions only)
// Paths are relative to /public — used as `/images/food-icons/${filename}`
const FOOD_ICONS = [
  "icons8-apple-fruit-100.png",
  "icons8-apple-jam-100.png",
  "icons8-apple-pie-100.png",
  "icons8-baguette-100.png",
  "icons8-bake-100.png",
  "icons8-berry-jam-100.png",
  "icons8-birthday-cake-100.png",
  "icons8-blueberry-100.png",
  "icons8-bread-100.png",
  "icons8-bread-loaf-100.png",
  "icons8-burrito-100.png",
  "icons8-cake-100.png",
  "icons8-cheesecake-100.png",
  "icons8-cherry-100.png",
  "icons8-cherry-cheesecake-100.png",
  "icons8-chocolate-bar-100.png",
  "icons8-chocolate-eclair-100.png",
  "icons8-cinnamon-roll-100.png",
  "icons8-citrus-100.png",
  "icons8-clementine-100.png",
  "icons8-coffee-beans-100.png",
  "icons8-cookies-100.png",
  "icons8-croissant-100.png",
  "icons8-cupcake-100.png",
  "icons8-cupcake-with-a-berry-100.png",
  "icons8-dairy-100.png",
  "icons8-doughnut-100.png",
  "icons8-dragee-100.png",
  "icons8-easter-bread-100.png",
  "icons8-edible-100.png",
  "icons8-food-and-wine-100.png",
  "icons8-french-fries-100.png",
  "icons8-garlic-bread-100.png",
  "icons8-grape-100.png",
  "icons8-ham-100.png",
  "icons8-hamburger-100.png",
  "icons8-hot-dog-100.png",
  "icons8-ice-cream-cone-100.png",
  "icons8-ice-cream-sundae-100.png",
  "icons8-ice-pop-100.png",
  "icons8-inedible-100.png",
  "icons8-jam-100.png",
  "icons8-jamon-100.png",
  "icons8-juice-bottle-100.png",
  "icons8-kebab-100.png",
  "icons8-kiwi-100.png",
  "icons8-lemonade-100.png",
  "icons8-low-salt-100.png",
  "icons8-macaron-100.png",
  "icons8-melon-100.png",
  "icons8-milk-bottle-100.png",
  "icons8-no-apple-100.png",
  "icons8-no-celery-100.png",
  "icons8-no-crustaceans-100.png",
  "icons8-no-eggs-100.png",
  "icons8-no-fish-100.png",
  "icons8-no-fructose-100.png",
  "icons8-no-gluten-100.png",
  "icons8-no-gmo-100.png",
  "icons8-no-lupines-100.png",
  "icons8-no-meat-100.png",
  "icons8-no-mustard-100.png",
  "icons8-no-nuts-100.png",
  "icons8-no-peanut-100.png",
  "icons8-no-sesame-100.png",
  "icons8-no-shellfish-100.png",
  "icons8-no-soy-100.png",
  "icons8-no-sugar-100.png",
  "icons8-orange-100.png",
  "icons8-orange-juice-100.png",
  "icons8-pastry-100.png",
  "icons8-pear-100.png",
  "icons8-pie-100.png",
  "icons8-pineapple-100.png",
  "icons8-pizza-100.png",
  "icons8-popcorn-100.png",
  "icons8-poultry-leg-100.png",
  "icons8-rack-of-lamb-100.png",
  "icons8-raspberry-100.png",
  "icons8-salami-100.png",
  "icons8-samosa-100.png",
  "icons8-sausage-100.png",
  "icons8-sausage-barbeque-100.png",
  "icons8-sausages-100.png",
  "icons8-slice-of-watermelon-100.png",
  "icons8-spoiled-food-100.png",
  "icons8-steak-100.png",
  "icons8-strawberry-100.png",
  "icons8-strawberry-cheesecake-100.png",
  "icons8-sugar-free-100.png",
  "icons8-sweet-banana-100.png",
  "icons8-taco-100.png",
  "icons8-the-toast-100.png",
  "icons8-vegan-food-100.png",
  "icons8-vegetarian-food-100.png",
  "icons8-waffle-100.png",
  "icons8-watermelon-100.png",
  "icons8-whole-watermelon-100.png",
];

const ICON_BASE = "/images/food-icons";

/** Extract a human-readable label from filename */
function iconLabel(filename: string): string {
  return filename
    .replace("icons8-", "")
    .replace("-100.png", "")
    .replace(/-/g, " ");
}

interface FoodIconPickerProps {
  /** Currently selected icon path (e.g. "/images/food-icons/icons8-cake-100.png") */
  value?: string | null;
  /** Called when user selects an icon */
  onChange: (path: string) => void;
  /** Whether to show the picker grid (managed by parent) */
  open: boolean;
  /** Called when user wants to close the picker */
  onClose: () => void;
}

const FoodIconPicker: React.FC<FoodIconPickerProps> = React.memo(
  ({ value, onChange, open, onClose }) => {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
      if (!search.trim()) return FOOD_ICONS;
      const q = search.toLowerCase();
      return FOOD_ICONS.filter((f) => iconLabel(f).toLowerCase().includes(q));
    }, [search]);

    const handleSelect = useCallback(
      (filename: string) => {
        onChange(`${ICON_BASE}/${filename}`);
        onClose();
      },
      [onChange, onClose]
    );

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-surface rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Escolher Ícone
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-text-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 pb-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Pesquisar ícone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
                autoFocus
              />
            </div>
          </div>

          {/* Current selection */}
          {value && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <span className="text-xs text-text-muted">Selecionado:</span>
              <img
                src={value}
                alt="Ícone atual"
                className="w-6 h-6 rounded"
              />
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            <div className="grid grid-cols-8 gap-2">
              {filtered.map((filename) => {
                const path = `${ICON_BASE}/${filename}`;
                const isSelected = value === path;
                return (
                  <button
                    key={filename}
                    type="button"
                    onClick={() => handleSelect(filename)}
                    className={`flex items-center justify-center p-1.5 rounded-lg border transition-colors hover:bg-primary-50 ${
                      isSelected
                        ? "border-primary-400 bg-primary-50 ring-1 ring-primary-300"
                        : "border-border"
                    }`}
                    title={iconLabel(filename)}
                  >
                    <img
                      src={path}
                      alt={iconLabel(filename)}
                      className="w-8 h-8 object-contain"
                    />
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-text-muted text-center py-4">
                Nenhum ícone encontrado.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

FoodIconPicker.displayName = "FoodIconPicker";
export default FoodIconPicker;