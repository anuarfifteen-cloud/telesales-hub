import { useEffect, useState } from "react";
import { ensureNetworkTime, networkNow, syncNetworkTime } from "@/lib/networkTime";

/**
 * Live Brunei clock driven by the network-anchored time service, never the
 * device clock — so moving the phone's clock cannot unlock bookings early.
 */
export function useNetworkClock() {
  const [now, setNow] = useState(() => new Date(networkNow()));

  useEffect(() => {
    syncNetworkTime();
    const id = setInterval(() => {
      ensureNetworkTime();
      setNow(new Date(networkNow()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}