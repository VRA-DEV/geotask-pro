import type { Task } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UseTasksOptions {
  /** Server-side filters (optional — omit for all tasks) */
  status?: string;
  sectorId?: number;
  responsibleId?: number;
  /** Pagination (optional — omit for all tasks) */
  page?: number;
  limit?: number;
}

function buildUrl(opts: UseTasksOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.sectorId) params.set("sector_id", String(opts.sectorId));
  if (opts.responsibleId)
    params.set("responsible_id", String(opts.responsibleId));
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return qs ? `/api/tasks?${qs}` : "/api/tasks";
}

export function useTasks(opts: UseTasksOptions = {}) {
  const url = buildUrl(opts);
  const isPaginated = !!opts.limit;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  // Handle both paginated ({ data, pagination }) and flat array responses
  const tasks: Task[] = Array.isArray(data) ? data : data?.data || [];
  const pagination = data?.pagination || null;

  return {
    tasks,
    pagination,
    isLoading,
    error,
    mutate,
    refresh: () => mutate(),
  };
}
