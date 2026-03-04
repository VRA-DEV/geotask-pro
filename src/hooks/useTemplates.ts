import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTemplates() {
  const { data, error, isLoading, mutate } = useSWR("/api/templates", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const saveTemplate = async (templateData: any, userId?: number) => {
    const isEdit = !!templateData.id;
    const res = await fetch("/api/templates", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...templateData, created_by: userId }),
    });
    if (res.ok) {
      mutate();
      return true;
    }
    return false;
  };

  const deleteTemplate = async (id: number) => {
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    mutate();
  };

  return {
    templates: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
    saveTemplate,
    deleteTemplate,
  };
}
