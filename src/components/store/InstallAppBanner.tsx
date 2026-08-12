import { useEffect, useRef, useState } from "react";
import { Download, MonitorDown, Share, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function detectPlatform() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /ipad|iphone|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChromium = !isIOS && !isSafari && /chrome|edge/i.test(ua);
  return { isIOS, isSafari, isAndroid, isChromium };
}

export function InstallAppBanner() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [busy, setBusy] = useState(false);
  const [guidance, setGuidance] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredRef.current = promptEvent;
      setDeferred(promptEvent);
    };
    const onInstalled = () => {
      deferredRef.current = null;
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const { isIOS, isSafari, isAndroid, isChromium } = detectPlatform();

  async function handleInstall() {
    const evt = deferredRef.current ?? deferred;
    if (!evt) {
      setGuidance(true);
      return;
    }
    setBusy(true);
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") {
        deferredRef.current = null;
        setDeferred(null);
        setInstalled(true);
      } else {
        setGuidance(true);
      }
    } catch {
      setGuidance(true);
    } finally {
      setBusy(false);
    }
  }

  const showPrompt = Boolean(deferred);

  return (
    <div className="fixed bottom-[13rem] right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl sm:bottom-24 sm:right-4">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-1 hover:bg-muted"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {isIOS ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install The Grand Zone app</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showPrompt
              ? "Tap install and it adds itself to your home screen."
              : isIOS
                ? "There's no app-store download — add it to your home screen from Safari instead."
                : "Add it to your home screen for one-tap access."}
          </p>
        </div>
      </div>

      {showPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {busy ? "Please wait…" : "Install app"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          {isIOS ? "See how to install" : "Add to home screen"}
        </button>
      )}

      {guidance ? (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/50 p-3">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            {isIOS ? (
              <>
                <Share className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Tap the <strong>Share</strong> button in Safari and choose{" "}
                  <strong>"Add to Home Screen"</strong>, then confirm.
                </span>
              </>
            ) : (
              <>
                <MonitorDown className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Open the browser menu{" "}
                  {isAndroid && isChromium ? "(⋮ or " : "("}
                  {isAndroid && isChromium ? <strong>"Install app"</strong> : <strong>⋮</strong>}
                  {isAndroid && isChromium ? ")" : " or the address bar icon"} and select{" "}
                  <strong>{"Add to Home screen"}</strong>.
                </span>
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
