import { supabase } from '../lib/supabase';
import { emptyProgress, localProgressStore, Progress, ProgressStore } from './progressStore';

/**
 * Progress saved in Supabase (table public.progress, one row per user).
 * A copy is also kept on the phone, so the app still works offline and
 * nothing is lost if the network drops.
 */

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

async function pushToCloud(userId: string, progress: Progress) {
  if (!supabase) return;
  await supabase.from('progress').upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() });
}

export const supabaseProgressStore: ProgressStore = {
  async load(userId) {
    const local = await localProgressStore.load(userId);
    if (!supabase) return local;
    try {
      const { data, error } = await supabase.from('progress').select('data').eq('user_id', userId).maybeSingle<{ data: Progress }>();
      if (error) throw error;
      if (!data) {
        // first time on the cloud: upload whatever is on this phone
        if (local.xp > 0 || local.learned.length > 0) await pushToCloud(userId, local);
        return local;
      }
      const cloud = { ...emptyProgress, ...data.data };
      // keep whichever copy was saved most recently
      return (local.savedAt ?? 0) > (cloud.savedAt ?? 0) ? local : cloud;
    } catch {
      return local; // offline — use the phone's copy
    }
  },

  async save(userId, progress) {
    progress = { ...progress, savedAt: Date.now() };
    await localProgressStore.save(userId, progress);
    // wait for a short pause in activity, then save to the cloud in one go
    clearTimeout(timers[userId]);
    timers[userId] = setTimeout(() => {
      pushToCloud(userId, progress).catch(() => {});
    }, 1500);
  },

  async reset(userId) {
    await localProgressStore.reset(userId);
    clearTimeout(timers[userId]);
    if (supabase) await supabase.from('progress').delete().eq('user_id', userId);
  },
};
