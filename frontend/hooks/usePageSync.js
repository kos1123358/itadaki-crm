'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

/**
 * Cross-device page synchronization hook
 *
 * Syncs the current page view AND selected customer across multiple devices.
 * Uses Supabase Realtime to broadcast and receive changes.
 */
export function usePageSync() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isLeader, setIsLeader] = useState(true);
  const [lastSyncedPath, setLastSyncedPath] = useState(null);
  const [syncedCustomerId, setSyncedCustomerId] = useState(null);
  const [syncSession, setSyncSession] = useState(null);

  const channelRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const debounceRef = useRef(null);
  const onCustomerChangeRef = useRef(null);

  // Initialize or fetch sync session
  const initSyncSession = useCallback(async () => {
    if (!user?.id) return;

    try {
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
        setSyncedCustomerId(existing.current_customer_id);
        return existing;
      }

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

  // Update current path and/or customer in database
  const broadcast = useCallback(async (path, customerId = null) => {
    if (!user?.id || !syncEnabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const updateData = {
          current_path: path,
          current_customer_id: customerId,
        };

        const { error } = await supabase
          .from('user_sync_sessions')
          .update(updateData)
          .eq('user_id', user.id);

        if (error) {
          console.error('[PageSync] Error broadcasting:', error);
        } else {
          setLastSyncedPath(path);
          console.log('[PageSync] Broadcasted:', { path, customerId });
        }
      } catch (error) {
        console.error('[PageSync] Broadcast error:', error);
      }
    }, 300);
  }, [user?.id, syncEnabled]);

  // Broadcast customer selection (for use in pages like call-work)
  const broadcastCustomer = useCallback(async (customerId) => {
    if (!user?.id || !syncEnabled || !isLeader) return;

    try {
      const { error } = await supabase
        .from('user_sync_sessions')
        .update({
          current_path: pathname,
          current_customer_id: customerId,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('[PageSync] Error broadcasting customer:', error);
      } else {
        console.log('[PageSync] Broadcasted customer:', customerId);
      }
    } catch (error) {
      console.error('[PageSync] Broadcast customer error:', error);
    }
  }, [user?.id, syncEnabled, isLeader, pathname]);

  // Register callback for customer changes
  const onCustomerChange = useCallback((callback) => {
    onCustomerChangeRef.current = callback;
  }, []);

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
        setSyncEnabled(!newValue);
      }
    } catch (error) {
      console.error('[PageSync] Toggle error:', error);
      setSyncEnabled(!newValue);
    }
  }, [user?.id, syncEnabled]);

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

    const channelName = `page-sync-${user.id}-${Date.now()}`;

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
          // Skip if this device is leading
          if (isLeader) return;

          const newPath = payload.new?.current_path;
          const newCustomerId = payload.new?.current_customer_id;

          console.log('[PageSync] Received update:', { newPath, newCustomerId, currentPath: pathname });

          // Handle path change
          if (newPath && newPath !== pathname && !isNavigatingRef.current) {
            console.log('[PageSync] Navigating to:', newPath);
            isNavigatingRef.current = true;
            router.push(newPath);
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 500);
          }

          // Handle customer ID change
          if (newCustomerId !== syncedCustomerId) {
            console.log('[PageSync] Customer changed:', newCustomerId);
            setSyncedCustomerId(newCustomerId);

            // Call registered callback
            if (onCustomerChangeRef.current && newCustomerId) {
              onCustomerChangeRef.current(newCustomerId);
            }
          }
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
  }, [user?.id, syncEnabled, isLeader, pathname, syncedCustomerId, router]);

  // Broadcast path changes when navigating (only if leader)
  useEffect(() => {
    if (!user?.id || !syncEnabled || !isLeader) return;
    if (isNavigatingRef.current) return;

    let customerId = null;
    const customerMatch = pathname?.match(/\/customers\/(\d+)/);
    if (customerMatch) {
      customerId = parseInt(customerMatch[1], 10);
    }

    broadcast(pathname, customerId);
  }, [pathname, user?.id, syncEnabled, isLeader, broadcast]);

  return {
    syncEnabled,
    toggleSync,
    isLeader,
    setLeaderMode,
    lastSyncedPath,
    syncedCustomerId,
    syncSession,
    broadcastCustomer,
    onCustomerChange,
  };
}
