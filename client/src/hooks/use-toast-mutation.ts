import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Query } from "@tanstack/react-query";

interface UseToastMutationOptions<TVariables = void> {
  mutationFn: (variables: TVariables) => Promise<unknown>;
  invalidateKeys?: (string | unknown[])[];
  invalidatePredicates?: ((query: Query) => boolean)[];
  successToast?: { title: string; description?: string };
  errorToast?: string;
  onSuccess?: (data: unknown, variables: TVariables) => void;
}

export function useToastMutation<TVariables = void>(
  options: UseToastMutationOptions<TVariables>,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data, variables) => {
      options.invalidateKeys?.forEach((key) => {
        const queryKey = typeof key === "string" ? [key] : key;
        queryClient.invalidateQueries({ queryKey });
      });
      options.invalidatePredicates?.forEach((predicate) => {
        queryClient.invalidateQueries({ predicate });
      });
      if (options.successToast) {
        toast(options.successToast);
      }
      options.onSuccess?.(data, variables);
    },
    onError: (error: Error) => {
      toast({
        title: options.errorToast || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
