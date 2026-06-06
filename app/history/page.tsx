import { AppHeader } from "@/components/layout";
import { HistoryList } from "./HistoryList";

// Handover history — list, filters, pagination.
export default function HistoryPage() {
  return (
    <>
      <AppHeader titleKey="historyTitle" />
      <HistoryList />
    </>
  );
}
