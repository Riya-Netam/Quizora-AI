import { useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Field";
import { Badge, EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/ui/Pagination";
import { adminApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync, useDebounced } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/format";

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null); // { user, next }
  const [busy, setBusy] = useState(false);
  const dq = useDebounced(q);

  const { data, loading, error, reload } = useAsync(
    () => adminApi.users({ page, page_size: PAGE_SIZE, ...(dq && { q: dq }), ...(status && { status }), ...(role && { role }) }),
    [dq, status, role, page],
  );

  const apply = async () => {
    setBusy(true);
    try { await adminApi.setUserStatus(target.user.id, target.next); toast.success(target.next === "suspended" ? "Account suspended" : "Account reactivated"); setTarget(null); reload(); }
    catch (e) { toast.error(errorMessage(e)); setTarget(null); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Users</h1>
      <div className="mt-6 grid gap-4 rounded-2xl border border-mist-200 bg-white p-4 sm:grid-cols-3">
        <div className="relative">
          <Input label="Search name or email" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-mist-400" aria-hidden="true" />
        </div>
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} />
        <Select label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} options={[{ value: "", label: "All" }, { value: "student", label: "Student" }, { value: "admin", label: "Admin" }]} />
      </div>

      <div className="mt-6">
        {loading && <div role="status" aria-label="Loading users" className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.items.length === 0 && <EmptyState icon={Search} title="No users match" description="Try a different search or filter." />}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-mist-200 bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Registered users</caption>
              <thead className="border-b border-mist-200 bg-mist-50 text-mist-600">
                <tr><th scope="col" className="px-4 py-3 font-medium">User</th><th scope="col" className="px-4 py-3 font-medium">Role</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Joined</th><th scope="col" className="px-4 py-3 text-right font-medium">Action</th></tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-b border-mist-100 last:border-0">
                    <td className="px-4 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-mist-600">{u.email}</p></td>
                    <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "brand" : "neutral"}>{u.role}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={u.status === "active" ? "green" : "red"}>{u.status}</Badge></td>
                    <td className="px-4 py-3 text-mist-600">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {u.id === me.id ? <span className="text-xs text-mist-500">You</span> : (
                        <Button size="sm" variant={u.status === "active" ? "secondary" : "primary"} onClick={() => setTarget({ user: u, next: u.status === "active" ? "suspended" : "active" })}>
                          {u.status === "active" ? "Suspend" : "Reactivate"}<span className="sr-only"> {u.email}</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </div>

      <ConfirmDialog open={!!target} danger={target?.next === "suspended"} loading={busy}
        title={target?.next === "suspended" ? "Suspend this account?" : "Reactivate this account?"}
        message={target ? (target.next === "suspended" ? `${target.user.email} will be signed out immediately and won't be able to log in until reactivated.` : `${target.user.email} will be able to log in again.`) : ""}
        confirmLabel={target?.next === "suspended" ? "Suspend account" : "Reactivate account"} onConfirm={apply} onCancel={() => setTarget(null)} />
    </div>
  );
}
