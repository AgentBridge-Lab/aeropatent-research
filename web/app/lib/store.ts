'use client';

import { create } from 'zustand';

// 오른쪽 보고서 드로어 — 그래프/분석 어디서든 노드를 선택하면 열린다.
interface DrawerState {
  nodeId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useDrawer = create<DrawerState>((set) => ({
  nodeId: null,
  open: (id) => set({ nodeId: id }),
  close: () => set({ nodeId: null }),
}));
