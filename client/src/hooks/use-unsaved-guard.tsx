import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface GuardState {
  isDirty: boolean;
  onSave?: () => Promise<void>;
  onDiscard?: () => void;
  message?: string;
}

interface UnsavedGuardContextValue {
  register: (id: string, guard: GuardState) => void;
  unregister: (id: string) => void;
  isDirty: boolean;
  safeNavigate: (path: string) => void;
}

const UnsavedGuardContext = createContext<UnsavedGuardContextValue>({
  register: () => {},
  unregister: () => {},
  isDirty: false,
  safeNavigate: () => {},
});

export function useUnsavedGuard() {
  return useContext(UnsavedGuardContext);
}

export function UnsavedGuardProvider({ children }: { children: React.ReactNode }) {
  const guardsRef = useRef<Map<string, GuardState>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setLocation] = useLocation();

  const recalcDirty = useCallback(() => {
    let count = 0;
    const guards = Array.from(guardsRef.current.values());
    for (const g of guards) {
      if (g.isDirty) count++;
    }
    setDirtyCount(count);
  }, []);

  const isDirty = dirtyCount > 0;

  const register = useCallback((id: string, g: GuardState) => {
    guardsRef.current.set(id, g);
    recalcDirty();
  }, [recalcDirty]);

  const unregister = useCallback((id: string) => {
    guardsRef.current.delete(id);
    recalcDirty();
  }, [recalcDirty]);

  const safeNavigate = useCallback(
    (path: string) => {
      if (dirtyCount > 0) {
        setPendingPath(path);
        setModalOpen(true);
      } else {
        setLocation(path);
      }
    },
    [dirtyCount, setLocation],
  );

  const getActiveGuard = useCallback((): GuardState | null => {
    const guards = Array.from(guardsRef.current.values());
    for (const g of guards) {
      if (g.isDirty) return g;
    }
    return null;
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const guards = Array.from(guardsRef.current.values());
      for (const g of guards) {
        if (g.isDirty && g.onSave) {
          await g.onSave();
        }
      }
      setModalOpen(false);
      if (pendingPath) {
        setLocation(pendingPath);
        setPendingPath(null);
      }
    } finally {
      setSaving(false);
    }
  }, [pendingPath, setLocation]);

  const handleDiscard = useCallback(() => {
    const guards = Array.from(guardsRef.current.values());
    for (const g of guards) {
      if (g.isDirty) g.onDiscard?.();
    }
    setModalOpen(false);
    if (pendingPath) {
      setLocation(pendingPath);
      setPendingPath(null);
    }
  }, [pendingPath, setLocation]);

  const handleCancel = useCallback(() => {
    setModalOpen(false);
    setPendingPath(null);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const activeGuard = getActiveGuard();

  return (
    <UnsavedGuardContext.Provider value={{ register, unregister, isDirty, safeNavigate }}>
      {children}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent data-testid="modal-unsaved-changes">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              {activeGuard?.message || "You have unsaved changes. What would you like to do?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleCancel} data-testid="button-unsaved-cancel">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard} data-testid="button-unsaved-discard">
              Discard
            </Button>
            {activeGuard?.onSave && (
              <Button onClick={handleSave} disabled={saving} data-testid="button-unsaved-save">
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedGuardContext.Provider>
  );
}
