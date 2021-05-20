import { DocumentNode } from "graphql";
import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useEffect, useState } from "react";
import { equal } from "@wry/equality";

import { Cache, Reference, StoreObject } from "../../cache";
import { useApolloClient } from "./useApolloClient";

export interface UseFragmentOptions<TData, TVars>
extends Omit<
  Cache.DiffOptions<TData, TVars>,
  | "query"
  | "optimistic"
> {
  fragment: DocumentNode | TypedDocumentNode<TData, TVars>;
  fragmentName?: string;
  from: StoreObject | Reference;
  // Override this field to make it optional (default: true).
  optimistic?: boolean;
}

export function useFragment<TData, TVars>({
  fragment,
  fragmentName,
  from,
  optimistic = true,
  ...rest
}: UseFragmentOptions<TData, TVars>): Cache.DiffResult<TData> {
  const client = useApolloClient();
  const id = client.cache.identify(from);
  const diffOptions: Cache.DiffOptions<TData, TVars> = {
    ...rest,
    query: client.cache["getFragmentDoc"](fragment, fragmentName),
    optimistic,
    id,
  };

  function read() {
    return client.cache.diff<TData>(diffOptions);
  }

  const diff = read();
  const setDiff = useState(diff)[1];

  useEffect(() => {
    const probablySameDiff = read();
    if (equal(diff, probablySameDiff)) {
      let cbCount = 0;
      return client.cache.watch({
        ...diffOptions,
        immediate: true,
        callback(diff) {
          // Skip the first diff, delivered because of immediate: true.
          if (++cbCount > 1) {
            setDiff(diff);
          }
        },
      });
    }
    setDiff(probablySameDiff);
  }, [diff.result]);

  return diff;
}
