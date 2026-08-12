"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Se réabonne aux changements Postgres d'une ou plusieurs tables et rappelle
// `onChange` (typiquement la fonction de fetch d'un onglet) à chaque
// insert/update/delete. Centralise l'abonnement/désabonnement
// supabase.channel(...).on('postgres_changes', ...).subscribe() qui était
// répété à l'identique dans plusieurs onglets du dashboard.
//
// `onChange` est appelé via une ref tenue à jour après chaque rendu (jamais
// pendant le rendu lui-même — React l'interdit) : la souscription n'a donc
// pas besoin d'être recréée quand `onChange` change de référence (ex:
// quand il ferme sur un state comme `selectedDate`), elle appelle toujours
// la version la plus à jour.
export function useRealtimeRefresh(channelName, tables, onChange, enabled = true) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const tablesKey = tables.join(',');

  useEffect(() => {
    if (!enabled) return;

    let channel = supabase.channel(channelName);
    tablesKey.split(',').forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (...args) => onChangeRef.current?.(...args)
      );
    });
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelName, enabled, tablesKey]);
}
