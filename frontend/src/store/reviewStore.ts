import { create } from "zustand";
import type { Annotation, CursorPosition, AISuggestion } from "@/types";

interface ReviewState {

  activeUsers: { id: number; username: string }[];

  cursors: Map<number, CursorPosition>;

  annotations: Annotation[];

  suggestions: AISuggestion[];

  selectedFileId: string | null;

  // Actions
  setSelectedFile: (fileId: string) => void;
  addAnnotation: (annotation: Annotation) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  resolveAnnotation: (annotationId: string) => void;
  addCommentToAnnotation: (
    annotationId: string,
    comment: Annotation["comments"][0]
  ) => void;
  updateCursor: (cursor: CursorPosition) => void;
  addUser: (user: { id: number; username: string }) => void;
  removeUser: (userId: number) => void;
  addSuggestion: (suggestion: AISuggestion) => void;
  setSuggestions: (suggestions: AISuggestion[]) => void;
  reset: () => void;
}

const initialState = {
  activeUsers: [],
  cursors: new Map(),
  annotations: [],
  suggestions: [],
  selectedFileId: null,
};

export const useReviewStore = create<ReviewState>((set) => ({
  ...initialState,

  setSelectedFile: (fileId) => set({ selectedFileId: fileId }),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [annotation, ...state.annotations],
    })),

  setAnnotations: (annotations) => set({ annotations }),

  resolveAnnotation: (annotationId) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId ? { ...a, resolved: true } : a
      ),
    })),

  addCommentToAnnotation: (annotationId, comment) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId
          ? { ...a, comments: [...a.comments, comment], comment_count: a.comment_count + 1 }
          : a
      ),
    })),

  updateCursor: (cursor) =>
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(cursor.user.id, cursor);
      return { cursors: newCursors };
    }),

  addUser: (user) =>
    set((state) => {
      if (state.activeUsers.some((u) => u.id === user.id)) return state;
      return { activeUsers: [...state.activeUsers, user] };
    }),

  removeUser: (userId) =>
    set((state) => ({
      activeUsers: state.activeUsers.filter((u) => u.id !== userId),
      cursors: (() => {
        const c = new Map(state.cursors);
        c.delete(userId);
        return c;
      })(),
    })),

  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [...state.suggestions, suggestion],
    })),

  setSuggestions: (suggestions) => set({ suggestions }),

  reset: () => set(initialState),
}));
