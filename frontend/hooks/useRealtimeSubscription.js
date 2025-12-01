'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Supabase Realtime購読用カスタムフック
 *
 * @param {string} table - 監視するテーブル名
 * @param {Function} onInsert - INSERT時のコールバック (payload.new)
 * @param {Function} onUpdate - UPDATE時のコールバック (payload.new, payload.old)
 * @param {Function} onDelete - DELETE時のコールバック (payload.old)
 * @param {Object} options - オプション設定
 * @param {string} options.schema - スキーマ名 (デフォルト: 'public')
 * @param {string} options.filter - フィルター条件 (例: 'customer_id=eq.123')
 * @param {boolean} options.enabled - 購読を有効にするか (デフォルト: true)
 */
export function useRealtimeSubscription(
  table,
  { onInsert, onUpdate, onDelete, schema = 'public', filter, enabled = true } = {}
) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!enabled || !table) return;

    const channelName = `realtime-${table}-${Date.now()}`;

    const channelConfig = {
      event: '*',
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        console.log(`[Realtime] ${table}:`, payload.eventType, payload);

        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload.new);
            break;
          case 'UPDATE':
            onUpdate?.(payload.new, payload.old);
            break;
          case 'DELETE':
            onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, schema, filter, enabled, onInsert, onUpdate, onDelete]);

  return channelRef.current;
}

/**
 * 複数テーブルを同時に購読するフック
 */
export function useMultiTableSubscription(subscriptions, enabled = true) {
  const channelsRef = useRef([]);

  useEffect(() => {
    if (!enabled || !subscriptions?.length) return;

    const channels = subscriptions.map((sub, index) => {
      const channelName = `realtime-multi-${sub.table}-${index}-${Date.now()}`;

      const channelConfig = {
        event: '*',
        schema: sub.schema || 'public',
        table: sub.table,
      };

      if (sub.filter) {
        channelConfig.filter = sub.filter;
      }

      return supabase
        .channel(channelName)
        .on('postgres_changes', channelConfig, (payload) => {
          console.log(`[Realtime] ${sub.table}:`, payload.eventType);
          sub.onEvent?.(payload);
        })
        .subscribe();
    });

    channelsRef.current = channels;

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions, enabled]);
}
