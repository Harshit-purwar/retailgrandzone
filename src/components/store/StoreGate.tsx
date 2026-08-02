import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Navigation, Clock, Check } from "lucide-react";
import { useSelectedStore, type Store } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import logo from "@/assets/grandzone-logo.png";

function StoreRow({ store, selected, onPick }: { store: Store; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors active:scale-[0.99] ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
      }`}
    >
      <span className="mt-0.5 rounded-full bg-brand p-2 text-brand-foreground">
        <MapPin className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{store.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{store.address || store.city}</span>
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
          <Clock className="h-3 w-3" /> {store.delivery_estimate} delivery
        </span>
      </span>
      {selected ? <Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

export function StorePickerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stores, loading, storeId, select, detect } = useSelectedStore();
  const [busy, setBusy] = useState(false);

  async function useMyLocation() {
    setBusy(true);
    try {
      const match = await detect();
      if (!match) {
        toast.error("No store is set up yet");
      } else if (!match.inRange) {
        toast.warning(`We don't deliver there yet — showing the nearest store (${match.store.city})`);
        onClose();
      } else {
        toast.success(`Delivering from ${match.store.name}`);
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read your location");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <img src={logo} alt="The Grand Zone logo" className="h-14 w-14 rounded-full object-cover" />
          <DialogTitle className="text-lg">Where should we deliver?</DialogTitle>
          <DialogDescription>Pick your city to see products available near you.</DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="h-12 w-full rounded-xl text-sm font-bold"
        >
          <Navigation className="mr-2 h-4 w-4" />
          {busy ? "Detecting location…" : "Use my current location"}
        </Button>

        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or choose a store <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading stores…</p> : null}
          {!loading && stores.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No stores configured yet.</p>
          ) : null}
          {stores.map((s) => (
            <StoreRow
              key={s.id}
              store={s}
              selected={s.id === storeId}
              onPick={() => {
                select(s.id);
                onClose();
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Blinkit-style location gate shown once, before the customer starts shopping. */
export function StoreGate() {
  const { storeId, stores, loading, hydrated } = useSelectedStore();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!hydrated || loading || dismissed) return;
    if (!storeId && stores.length > 0) setOpen(true);
  }, [hydrated, loading, storeId, stores.length, dismissed]);

  return (
    <StorePickerDialog
      open={open}
      onClose={() => {
        setOpen(false);
        setDismissed(true);
      }}
    />
  );
}
