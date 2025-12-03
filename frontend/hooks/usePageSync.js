'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

/**
 * Cross-device page synchronization hook
 *
 * Syncs the current page view across multiple devices for the same user.
 * Uses Supabase Realtime to broadcast and receive page changes.
 */
export function usePageSync() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isLeader, setIsLeader] = useState(true); // This device is leading navigation
  const [lastSyncedPath, setLastSyncedPath] = useState(null);
  const [syncSession, setSyncSession] = useState(null);

  const channelRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const debounceRef = useRef(null);

  // Initialize or fetch sync session
  const initSyncSession = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Try to get existing session
      const { data: existing, error: fetchError } = await supabase
        .from('user_sync_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('[PageSync] Error fetching session:', fetchError);
        return;
      }

      if (existing) {
        setSyncSession(existing);
        setSyncEnabled(existing.sync_enabled);
        return existing;
      }

      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('user_sync_sessions')
        .insert({
          user_id: user.id,
          current_path: pathname || '/',
          sync_enabled: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[PageSync] Error creating session:', insertError);
        return;
      }

      setSyncSession(newSession);
      return newSession;
    } catch (error) {
      console.error('[PageSync] Init error:', error);
    }
  }, [user?.id, pathname]);

  // Update current path in database
  const broadcastPath = useCallback(async (path, customerId = null) => {
    if (!user?.id || !syncEnabled) return;

    // Debounce rapid path changes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('user_sync_sessions')
          .update({
            current_path: path,
            current_customer_id: customerId,
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('[PageSync] Error broadcasting path:', error);
        } else {
          setLastSyncedPath(path);
          console.log('[PageSync] Broadcasted path:', path);
        }
      } catch (error) {
        console.error('[PageSync] Broadcast error:', error);
      }
    }, 300);
  }, [user?.id, syncEnabled]);

  // Toggle sync enabled/disabled
  const toggleSync = useCallback(async () => {
    if (!user?.id) return;

    const newValue = !syncEnabled;
    setSyncEnabled(newValue);

    try {
      const { error } = await supabase
        .from('user_sync_sessions')
        .update({ sync_enabled: newValue })
        .eq('user_id', user.id);

      if (error) {
        console.error('[PageSync] Error toggling sync:', error);
        setSyncEnabled(!newValue); // Revert on error
      }
    } catch (error) {
      console.error('[PageSync] Toggle error:', error);
      setSyncEnabled(!newValue);
    }
  }, [user?.id, syncEnabled]);

  // Set this device as leader (broadcasts) or follower (receives)
  const setLeaderMode = useCallback((leader) => {
    setIsLeader(leader);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    if (user?.id) {
      initSyncSession();
    }
  }, [user?.id, initSyncSession]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user?.id || !syncEnabled) return;

    const channelName = `page-sync-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sync_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newPath = payload.new?.current_path;

          // Skip if this device is leading or if navigating
          if (isLeader || isNavigatingRef.current) return;

          // Skip if path hasn't changed or matches current
          if (!newPath || newPath === pathname || newPath === lastSyncedPath) return;

          console.log('[PageSync] Received path update:', newPath);
          isNavigatingRef.current = true;

          router.push(newPath);

          // Reset navigation flag after a short delay
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('[PageSync] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, syncEnabled, isLeader, pathname, lastSyncedPath, router]);

  // Broadcast path changes when navigating (only if leader)
  useEffect(() => {
    if (!user?.id || !syncEnabled || !isLeader) return;

    // Skip if this is a received navigation
    if (isNavigatingRef.current) return;

    // Extract customer ID from path if on customer-related pages
    let customerId = null;
    const customerMatch = pathname?.match(/\/customers\/(\d+)/);
    if (customerMatch) {
      customerId = parseInt(customerMatch[1], 10);
    }

    broadcastPath(pathname, customerId);
  }, [pathname, user?.id, syncEnabled, isLeader, broadcastPath]);

  return {
    syncEnabled,
    toggleSync,
    isLeader,
    setLeaderMode,
    lastSyncedPath,
    syncSession,
  };
}
