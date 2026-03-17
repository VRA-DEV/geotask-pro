import useSWR from "swr";
import type { Team } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTeams() {
  const { data, error, isLoading, mutate } = useSWR<Team[]>(
    "/api/teams",
    fetcher,
    { revalidateOnFocus: false },
  );
  return { teams: data || [], isLoading, error, mutate };
}
