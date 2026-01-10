import { TransactionsTable } from "@/components/admin/transactions-table";
import { CreditCard } from "lucide-react";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">View and manage all transaction records</p>
        </div>
      </div>

      <TransactionsTable />
    </div>
  );
}