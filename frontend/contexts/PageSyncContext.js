'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const PageSyncContext = createContext(null);

/**
 * Cross-device page synchronization provider
 *
 * Syncs the current page view AND selected customer across multiple devices.
 * Uses Supabase Realtime to broadcast and receive changes.
 */
export function PageSyncProvider({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isLeader, setIsLeader] = useState(true);
  const [lastSyncedPath, setLastSyncedPath] = useState(null);
  const [syncedCustomerId, setSyncedCustomerId] = useState(null);
  const [syncSession, setSyncSession] = useState(null);

  // Refs to avoid stale closures in realtime callbacks
  const channelRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const debounceRef = useRef(null);
  const isLeaderRef = useRef(isLeader);
  const syncedCustomerIdRef = useRef(syncedCustomerId);
  const pathnameRef = useRef(pathname);

  // Keep refs in sync with state
  useEffect(() => {
    isLeaderRef.current = isLeader;
  }, [isLeader]);

  useEffect(() => {
    syncedCustomerIdRef.current = syncedCustomerId;
  }, [syncedCustomerId]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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
        const customerId = existing.current_customer_id ? Number(existing.current_customer_id) : null;
        setSyncedCustomerId(customerId);
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
    if (!user?.id || !syncEnabled) return;
    // Use ref to check current leader status
    if (!isLeaderRef.current) return;

    try {
      console.log('[PageSync] Broadcasting customer:', customerId);
      const { error } = await supabase
        .from('user_sync_sessions')
        .update({
          current_path: pathnameRef.current,
          current_customer_id: customerId,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('[PageSync] Error broadcasting customer:', error);
      } else {
        console.log('[PageSync] Successfully broadcasted customer:', customerId);
      }
    } catch (error) {
      console.error('[PageSync] Broadcast customer error:', error);
    }
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
        setSyncEnabled(!newValue);
      }
    } catch (error) {
      console.error('[PageSync] Toggle error:', error);
      setSyncEnabled(!newValue);
    }
  }, [user?.id, syncEnabled]);

  const setLeaderMode = useCallback((leader) => {
    console.log('[PageSync] Setting leader mode:', leader);
    setIsLeader(leader);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    if (user?.id) {
      initSyncSession();
    }
  }, [user?.id, initSyncSession]);

  // Subscribe to realtime changes - only recreate when user or syncEnabled changes
  useEffect(() => {
    if (!user?.id || !syncEnabled) return;

    const channelName = `page-sync-${user.id}-${Date.now()}`;
    console.log('[PageSync] Creating channel:', channelName);

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
          // Use refs to get current values (not stale closure values)
          const currentIsLeader = isLeaderRef.current;
          const currentSyncedCustomerId = syncedCustomerIdRef.current;
          const currentPathname = pathnameRef.current;

          console.log('[PageSync] Received realtime update:', {
            payload: payload.new,
            currentIsLeader,
            currentSyncedCustomerId,
            currentPathname,
          });

          // Skip if this device is leading
          if (currentIsLeader) {
            console.log('[PageSync] Skipping - this device is leader');
            return;
          }

          const newPath = payload.new?.current_path;
          const newCustomerId = payload.new?.current_customer_id
            ? Number(payload.new.current_customer_id)
            : null;

          console.log('[PageSync] Parsed values:', { newPath, newCustomerId });

          // Handle path change
          if (newPath && newPath !== currentPathname && !isNavigatingRef.current) {
            console.log('[PageSync] Navigating to:', newPath);
            isNavigatingRef.current = true;
            router.push(newPath);
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 500);
          }

          // Handle customer ID change
          if (newCustomerId !== currentSyncedCustomerId) {
            console.log('[PageSync] Customer changed from', currentSyncedCustomerId, 'to', newCustomerId);
            setSyncedCustomerId(newCustomerId);
          }
        }
      )
      .subscribe((status) => {
        console.log('[PageSync] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[PageSync] Removing channel:', channelName);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, syncEnabled, router]);

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

  const value = {
    syncEnabled,
    toggleSync,
    isLeader,
    setLeaderMode,
    lastSyncedPath,
    syncedCustomerId,
    syncSession,
    broadcastCustomer,
  };

  return (
    <PageSyncContext.Provider value={value}>
      {children}
    </PageSyncContext.Provider>
  );
}

export function usePageSync() {
  const context = useContext(PageSyncContext);
  if (!context) {
    throw new Error('usePageSync must be used within a PageSyncProvider');
  }
  return context;
}
