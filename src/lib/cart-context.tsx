import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type CartLine = {
  /** Unique line key — a product id for normal items, a combo id for combos. */
  productId: string;
  /** "combo" marks a bundled combo offer line (charged at the combo price). */
  kind?: "product" | "combo";
  /** Snapshot of the bundled products ([{ id, title }]) — set on combo lines. */
  comboItems?: { id: string; title: string }[];
  title: string;
  image_url: string;
  price: number;
  quantity: number;
  slug: string | null;
  /** Available stock at the time the line was added — used to cap quantities. */
  stock?: number | null;
};

/** Caps a requested quantity to the available stock (when known). */
function capToStock(quantity: number, stock?: number | null): number {
  if (stock === undefined || stock === null || !Number.isFinite(Number(stock))) return quantity;
  return Math.min(quantity, Math.max(0, Number(stock)));
}

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const KEY = "shopkart-cart-v1";

const CartContext = createContext<CartValue>({
  lines: [],
  count: 0,
  subtotal: 0,
  add: () => {},
  setQuantity: () => {},
  remove: () => {},
  clear: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore malformed cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      const stock = line.stock ?? existing?.stock ?? null;
      if (existing) {
        const wanted = existing.quantity + quantity;
        const capped = capToStock(wanted, stock);
        if (capped < wanted) toast.warning(`Only ${capped} left in stock`);
        return prev.map((l) =>
          l.productId === line.productId ? { ...l, stock, quantity: Math.max(1, capped) } : l,
        );
      }
      const capped = capToStock(quantity, stock);
      if (capped <= 0) {
        toast.error("This product is out of stock");
        return prev;
      }
      if (capped < quantity) toast.warning(`Only ${capped} left in stock`);
      return [...prev, { ...line, stock, quantity: capped }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => {
            if (l.productId !== productId) return l;
            const capped = capToStock(quantity, l.stock);
            if (capped < quantity) toast.warning(`Only ${capped} left in stock`);
            return { ...l, quantity: Math.max(1, capped) };
          }),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * Number(l.price), 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
