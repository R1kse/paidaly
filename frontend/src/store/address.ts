import { create } from 'zustand';

export type SavedAddress = {
  id: string;
  label: string;
  addressText: string;
  lat: number;
  lng: number;
};

type AddressState = {
  active: SavedAddress | null;
  setActive: (a: SavedAddress | null) => void;
};

export const useAddressStore = create<AddressState>((set) => ({
  active: null,
  setActive: (a) => set({ active: a }),
}));
