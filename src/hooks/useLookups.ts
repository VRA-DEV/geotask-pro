import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLookups() {
  const { data, error, isLoading, mutate } = useSWR("/api/lookups", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
  });

  if (error) console.error("useLookups error:", error);
  if (data?.error) console.error("useLookups API error:", data.error);

  return {
    contracts: data?.contracts || [],
    sectors: data?.sectors || [],
    taskTypes: data?.task_types || [],
    citiesNeighborhoods: data?.cities_neighborhoods || {},
    isLoading,
    error,
    mutate,
  };
}
