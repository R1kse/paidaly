import { create } from 'zustand';

export type CartLine = {
  lineId: string;
  menuItemId: string;
  title: string;
  basePrice: number;
  quantity: number;
  modifierOptionIds: string[];
  modifiersLabel: string;
};

type CartState = {
  lines: CartLine[];
  comment: string;
  deliveryType: 'DELIVERY' | 'PICKUP';
  paymentMethod: 'CASH' | 'CARD' | 'KASPI';
  setComment: (comment: string) => void;
  setDeliveryType: (type: 'DELIVERY' | 'PICKUP') => void;
  setPaymentMethod: (method: 'CASH' | 'CARD' | 'KASPI') => void;
  addLine: (line: CartLine) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
};

function sameOptions(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  comment: '',
  deliveryType: 'DELIVERY',
  paymentMethod: 'CASH',
  setComment: (comment) => set({ comment }),
  setDeliveryType: (deliveryType) => set({ deliveryType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  addLine: (line) =>
    set((state) => {
      const existing = state.lines.find(
        (l) => l.menuItemId === line.menuItemId && sameOptions(l.modifierOptionIds, line.modifierOptionIds),
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + line.quantity } : l,
          ),
        };
      }
      return { lines: [...state.lines, line] };
    }),
  increment: (lineId) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    })),
  decrement: (lineId) =>
    set((state) => ({
      lines: state.lines
        .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    })),
  removeLine: (lineId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.lineId !== lineId),
    })),
  clear: () => set({ lines: [], comment: '' }),
}));
