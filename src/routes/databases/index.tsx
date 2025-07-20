import { createFileRoute, redirect } from "@tanstack/react-router";
import { getDefaultStore } from "jotai";
import DatabasesPage from "@/components/databases/DatabasesPage";
import { selectedDatabaseAtom } from "@/state/atoms";

export const Route = createFileRoute("/databases/")({
  component: DatabasesPage,
  beforeLoad: async () => {
    const store = getDefaultStore();
    const db = store.get(selectedDatabaseAtom);
    if (db) {
      throw redirect({
        to: "/databases/$databaseId",
        params: { databaseId: db.title },
      });
    }
    return null;
  },
});
