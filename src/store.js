import { create } from 'zustand'

export const useGame = create((set) => ({
  wallet: null,
  hasAccess: false,
  fuel: 0,
  status: '',
  racing: false,
  result: null,
  setWallet: (w) => set({ wallet: w }),
  setHasAccess: (v) => set({ hasAccess: v }),
  setFuel: (f) => set({ fuel: f }),
  setStatus: (s) => set({ status: s }),
  setRacing: (r) => set({ racing: r }),
  setResult: (r) => set({ result: r })
}))
