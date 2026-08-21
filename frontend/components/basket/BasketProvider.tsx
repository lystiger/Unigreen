"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  clearBasket as clearStored,
  initialBasket,
  loadBasket,
  saveBasket,
} from "@/lib/basket/persistence";
import {
  basketReducer,
  itemCount,
  submittableItems,
  type BasketAction,
  type BasketResult,
  type PublishedProduct,
} from "@/lib/basket/reducer";
import type { BasketItem, BasketState } from "@/lib/basket/types";

export type RevalidationStatus = "idle" | "checking" | "fresh" | "stale";

interface BasketApi {
  readonly state: BasketState;
  readonly count: number;
  readonly submittable: readonly BasketItem[];
  /** True until the stored basket has been read; UI shows nothing basket-shaped
   *  before this flips, so server and first client render agree. */
  readonly hydrated: boolean;
  readonly revalidation: RevalidationStatus;
  readonly dispatch: (action: BasketAction) => BasketResult;
  readonly reconcile: (published: readonly PublishedProduct[]) => void;
  readonly markRevalidation: (status: RevalidationStatus) => void;
  readonly isOpen: boolean;
  readonly openDrawer: () => void;
  readonly closeDrawer: () => void;
}

const BasketContext = createContext<BasketApi | null>(null);

/**
 * Owns the basket for the whole public site.
 *
 * Hydration is the delicate part (section 4.1). `useState(initialBasket)` gives
 * the server and the first client render the same empty basket; the stored
 * value is only read in an effect afterwards. Rendering counts before
 * `hydrated` is true would produce markup the server could not have produced.
 */
export function BasketProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<BasketState>(initialBasket);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [revalidation, setRevalidation] = useState<RevalidationStatus>("idle");

  // Avoids writing back the exact value just read on mount.
  const skipNextSave = useRef(true);

  useEffect(() => {
    const outcome = loadBasket();
    if (outcome.status === "loaded") {
      // react-hooks/set-state-in-effect exists to catch state derivable during
      // render. This is the opposite case: localStorage cannot be read during
      // render without diverging from the server's markup, so section 4.1
      // requires exactly this deferral. The cost is one extra render on mount,
      // once, by design — not a cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(outcome.state);
    } else if (outcome.status === "discarded") {
      // A corrupt or future-versioned basket resets rather than blocking the
      // page. Nothing is shown about it: the buyer never chose to have one.
      clearStored();
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveBasket(state);
  }, [state, hydrated]);

  // `dispatch` returns the rejection so the caller can raise a toast, which
  // means it must resolve synchronously — and a `setState` updater does not run
  // until React re-renders. So the current state is mirrored in a ref: synced
  // from an effect for changes React drives (hydration), and written eagerly
  // inside `dispatch` so two dispatches in the same tick compose correctly.
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dispatch = useCallback((action: BasketAction): BasketResult => {
    const result = basketReducer(stateRef.current, action);
    stateRef.current = result.state;
    setState(result.state);
    return result;
  }, []);

  const reconcile = useCallback((published: readonly PublishedProduct[]) => {
    const result = basketReducer(stateRef.current, { type: "reconcile", published });
    stateRef.current = result.state;
    setState(result.state);
  }, []);

  const value = useMemo<BasketApi>(
    () => ({
      state,
      count: itemCount(state),
      submittable: submittableItems(state),
      hydrated,
      revalidation,
      dispatch,
      reconcile,
      markRevalidation: setRevalidation,
      isOpen,
      openDrawer: () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
    }),
    [state, hydrated, revalidation, dispatch, reconcile, isOpen],
  );

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketApi {
  const context = useContext(BasketContext);
  if (context === null) {
    throw new Error("useBasket must be used inside BasketProvider");
  }
  return context;
}
