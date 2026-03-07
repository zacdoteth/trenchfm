import { lazy, Suspense, useEffect, useState } from "react";
import { initAuth } from "./auth.js";
import { setActiveWallet } from "./frontrun.js";

const PodiumTeleport = lazy(() => import("./PodiumTeleport.jsx"));

const fullscreenShell = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0a0008",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
};

function StatusScreen({ color, message }) {
  return <div style={{ ...fullscreenShell, color }}>{message}</div>;
}

export default function App() {
  const [state, setState] = useState({ status: "loading", user: null, wallets: [] });

  useEffect(() => {
    let dead = false;

    initAuth()
      .then(({ user, wallets }) => {
        if (dead) return;

        const defaultWallet = wallets.find((wallet) => wallet.is_default) || wallets[0];
        if (defaultWallet) setActiveWallet(defaultWallet.address);
        setState({ status: "ready", user, wallets });
      })
      .catch((error) => {
        console.error("[auth] failed:", error);
        if (!dead) setState({ status: "error", user: null, wallets: [] });
      });

    return () => {
      dead = true;
    };
  }, []);

  if (state.status === "loading") {
    return <StatusScreen color="#00d4ff" message="connecting..." />;
  }

  if (state.status === "error") {
    return <StatusScreen color="#ff2d78" message="auth failed - reload to retry" />;
  }

  return (
    <Suspense fallback={<StatusScreen color="#00d4ff" message="loading stage..." />}>
      <PodiumTeleport user={state.user} wallets={state.wallets} />
    </Suspense>
  );
}
