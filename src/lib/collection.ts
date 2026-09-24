import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { localCollection } from "./local-storage";

export function createCollection<T extends { id: string }>(key: string, schema: z.ZodType<T>) {
  const store = localCollection(key, schema);
  const queryKey = [key];

  const useList = () => useQuery({ queryKey, queryFn: async () => store.list() });

  const useMutate = <TInput>(mutationFn: (input: TInput) => Promise<unknown>) => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey }) });
  };

  return {
    ...store,
    queryKey,
    useList,
    useItem: (id: string | undefined) => useList().data?.find((item) => item.id === id),
    useMutate,
    useRemove: () => useMutate(async (id: string) => store.remove(id)),
  };
}
