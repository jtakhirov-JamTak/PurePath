import { createContext, useContext, useState, useCallback, useEffect } from "react";
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
  register: (guard: GuardState) => void;
  unregister: () => void;
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
  const [guard, setGuard] = useState<GuardState | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setLocation] = useLocation();

  const isDirty = guard?.isDirty ?? false;

  const register = useCallback((g: GuardState) => {
    setGuard(g);
  }, []);

  const unregister = useCallback(() => {
    setGuard(null);
  }, []);

  const safeNavigate = useCallback(
    (path: string) => {
      if (isDirty) {
        setPendingPath(path);
        setModalOpen(true);
      } else {
        setLocation(path);
      }
    },
    [isDirty, setLocation],
  );

  const handleSave = useCallback(async () => {
    if (!guard?.onSave) return;
    setSaving(true);
    try {
      await guard.onSave();
      setModalOpen(false);
      if (pendingPath) {
        setLocation(pendingPath);
        setPendingPath(null);
      }
    } finally {
      setSaving(false);
    }
  }, [guard, pendingPath, setLocation]);

  const handleDiscard = useCallback(() => {
    guard?.onDiscard?.();
    setModalOpen(false);
    if (pendingPath) {
      setLocation(pendingPath);
      setPendingPath(null);
    }
  }, [guard, pendingPath, setLocation]);

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

  return (
    <UnsavedGuardContext.Provider value={{ register, unregister, isDirty, safeNavigate }}>
      {children}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent data-testid="modal-unsaved-changes">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              {guard?.message || "You have unsaved changes. What would you like to do?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleCancel} data-testid="button-unsaved-cancel">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard} data-testid="button-unsaved-discard">
              Discard
            </Button>
            {guard?.onSave && (
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
