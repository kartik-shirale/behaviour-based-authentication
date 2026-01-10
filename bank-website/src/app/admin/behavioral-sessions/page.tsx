import { BehavioralSessionsTable } from "@/components/admin/behavioral-sessions-table";
import { Activity } from "lucide-react";

export default function BehavioralSessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Behavioral Sessions</h1>
          <p className="text-sm text-muted-foreground">Monitor user behavior patterns for fraud detection</p>
        </div>
      </div>

      <BehavioralSessionsTable />
    </div>
  );
}