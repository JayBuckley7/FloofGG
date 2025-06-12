import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function DataInspector() {
  const cards = useQuery(api.cards.listAll);

  return (
    <div>
      <h1>Card Data Inspector</h1>
      <pre>{JSON.stringify(cards, null, 2)}</pre>
    </div>
  );
} 