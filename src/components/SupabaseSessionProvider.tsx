"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const SessionContext = createContext<any>(null);

export function SupabaseSessionProvider({ children }: { children: any }) {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Initial load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for changes (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SessionContext.Provider value={{ session, supabase }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSupabaseSession() {
  return useContext(SessionContext);
}
