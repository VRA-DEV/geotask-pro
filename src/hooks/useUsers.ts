import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR("/api/users", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  return {
    users: (data as any[]) || [],
    isLoading,
    error,
    mutate,
  };
}
