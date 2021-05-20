import * as React from "react";
import { render, wait } from "@testing-library/react";
import { act } from "react-dom/test-utils";

import { useFragment } from "../useFragment";
import { MockedProvider } from "../../../testing";
import { InMemoryCache, gql, TypedDocumentNode, Reference } from "../../../core";
import { useQuery } from "../useQuery";

describe("useFragment", () => {
  it("is importable and callable", () => {
    expect(typeof useFragment).toBe("function");
  });

  it("can rerender individual list elements", async () => {
    const cache = new InMemoryCache({
      typePolicies: {
        Item: {
          fields: {
            text(existing, { readField }) {
              return existing || `Item #${readField("id")}`;
            },
          },
        },
      },
    });

    type Item = {
      __typename: string;
      id: number;
      text?: string;
    };

    const fragment: TypedDocumentNode<Item> = gql`
      fragment ItemText on Item {
        text
      }
    `;

    type QueryData = {
      list: Item[];
    };

    const listQuery: TypedDocumentNode<QueryData> = gql`
      query {
        list {
          id
        }
      }
    `;

    cache.writeQuery({
      query: listQuery,
      data: {
        list: [
          { __typename: "Item", id: 1 },
          { __typename: "Item", id: 2 },
          { __typename: "Item", id: 5 },
        ],
      },
    })

    const renders: string[] = [];

    function List() {
      renders.push("list");
      const { loading, data } = useQuery(listQuery);
      expect(loading).toBe(false);
      return (
        <ol>
          {data!.list.map(item => <Item key={item.id} id={item.id}/>)}
        </ol>
      );
    }

    function Item(props: { id: number }) {
      renders.push("item " + props.id);
      const { complete, result } = useFragment({
        fragment,
        fragmentName: "ItemText",
        from: {
          __typename: "Item",
          id: props.id,
        },
      });
      return <li>{complete ? result!.text : "incomplete"}</li>;
    }

    const { getAllByText } = render(
      <MockedProvider cache={cache}>
        <List />
      </MockedProvider>
    );

    function getItemTexts() {
      return getAllByText(/^Item/).map(
        li => li.firstChild!.textContent
      );
    }

    await wait(() => {
      expect(getItemTexts()).toEqual([
        "Item #1",
        "Item #2",
        "Item #5",
      ]);
    });

    expect(renders).toEqual([
      "list",
      "item 1",
      "item 2",
      "item 5",
    ]);

    act(() => {
      cache.writeFragment({
        fragment,
        data: {
          __typename: "Item",
          id: 2,
          text: "Item #2 updated",
        },
      });
    });

    await wait(() => {
      expect(getItemTexts()).toEqual([
        "Item #1",
        "Item #2 updated",
        "Item #5",
      ]);
    });

    expect(renders).toEqual([
      "list",
      "item 1",
      "item 2",
      "item 5",
      // Only the second item should have re-rendered.
      "item 2",
    ]);

    act(() => {
      cache.modify({
        fields: {
          list(list: Reference[], { readField }) {
            return [
              ...list,
              cache.writeFragment({
                fragment,
                data: {
                  __typename: "Item",
                  id: 3,
                },
              })!,
              cache.writeFragment({
                fragment,
                data: {
                  __typename: "Item",
                  id: 4,
                },
              })!,
            ].sort((ref1, ref2) => (
              readField<Item["id"]>("id", ref1)! -
              readField<Item["id"]>("id", ref2)!
            ));
          },
        },
      });
    });

    await wait(() => {
      expect(getItemTexts()).toEqual([
        "Item #1",
        "Item #2 updated",
        "Item #3",
        "Item #4",
        "Item #5",
      ]);
    });

    expect(renders).toEqual([
      "list",
      "item 1",
      "item 2",
      "item 5",
      "item 2",
      // This is what's new:
      "list",
      "item 1",
      "item 2",
      "item 3",
      "item 4",
      "item 5",
    ]);

    act(() => {
      cache.writeFragment({
        fragment,
        data: {
          __typename: "Item",
          id: 4,
          text: "Item #4 updated",
        },
      });
    });

    await wait(() => {
      expect(getItemTexts()).toEqual([
        "Item #1",
        "Item #2 updated",
        "Item #3",
        "Item #4 updated",
        "Item #5",
      ]);
    });

    expect(renders).toEqual([
      "list",
      "item 1",
      "item 2",
      "item 5",
      "item 2",
      "list",
      "item 1",
      "item 2",
      "item 3",
      "item 4",
      "item 5",
      // Only the fourth item should have re-rendered.
      "item 4",
    ]);

    expect(cache.extract()).toMatchSnapshot();
  });
});
