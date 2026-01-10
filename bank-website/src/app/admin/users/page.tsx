import { UsersTable } from "@/components/admin/users-table";

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
            </div>

            <UsersTable />
        </div>
    );
}