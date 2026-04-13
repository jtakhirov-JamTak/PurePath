import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield, Users, UserCheck, UserX, Download, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useAuth } from "@/hooks/use-auth";
import { format, subDays, eachDayOfInterval } from "date-fns";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string | null;
  hasAccess: boolean;
  personalEmail: string | null;
  onboardingComplete: boolean;
  cohort: string | null;
  journalCount: number;
  habitCompletionCount: number;
  lastActive: string | null;
}

function getUserName(user: AdminUser): string {
  if (user.firstName) {
    return `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`;
  }
  return user.personalEmail || user.email || user.id.slice(0, 8);
}

function csvEscape(val: any): string {
  if (val == null) return "";
  const s = String(val);
  return /[",\n\r]/.test(s) || /^[=+\-@\t\r]/.test(s)
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function ActivityHeatmap({ userId }: { userId: string }) {
  const { data } = useQuery<{ activeDates: string[] }>({
    queryKey: ["/api/admin/users", userId, "activity"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/users/${userId}/activity`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
  const activeSet = new Set(data?.activeDates ?? []);

  return (
    <div className="flex gap-1 flex-wrap pt-2 pb-1">
      {days.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const active = activeSet.has(dateStr);
        return (
          <div
            key={dateStr}
            title={`${format(day, "MMM d")}${active ? " - active" : ""}`}
            className={`w-4 h-4 rounded-sm ${active ? "bg-green-500" : "bg-muted"}`}
          />
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cohortFilter, setCohortFilterRaw] = useState("all");
  function setCohortFilter(value: string) {
    setCohortFilterRaw(value);
    setSelectedIds(new Set());
  }
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const cohorts = useMemo(() => {
    const set = new Set(users.map(u => u.cohort).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (cohortFilter === "all") return users;
    if (cohortFilter === "none") return users.filter(u => !u.cohort);
    return users.filter(u => u.cohort === cohortFilter);
  }, [users, cohortFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const withAccess = users.filter(u => u.hasAccess).length;
    return { total, withAccess, withoutAccess: total - withAccess };
  }, [users]);

  const toggleMutation = useToastMutation<{ userId: string; hasAccess: boolean }>({
    mutationFn: async ({ userId, hasAccess }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/access`, { hasAccess });
    },
    invalidateKeys: ["/api/admin/users"],
    successToast: { title: "Access updated" },
    errorToast: "Failed to update access",
  });

  const batchAccessMutation = useToastMutation<{ userIds: string[]; hasAccess: boolean }>({
    mutationFn: async ({ userIds, hasAccess }) => {
      await apiRequest("PATCH", "/api/admin/users/batch-access", { userIds, hasAccess });
    },
    invalidateKeys: ["/api/admin/users"],
    successToast: { title: "Access updated for selected users" },
    errorToast: "Failed to batch update",
  });

  const cohortMutation = useToastMutation<{ userId: string; cohort: string | null }>({
    mutationFn: async ({ userId, cohort }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/cohort`, { cohort });
    },
    invalidateKeys: ["/api/admin/users"],
    successToast: { title: "Cohort updated" },
    errorToast: "Failed to update cohort",
  });

  const selectableUsers = filteredUsers.filter(u => u.id !== currentUser?.id);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedIds.has(u.id));

  function toggleSelect(userId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map(u => u.id)));
    }
  }

  function handleBatchAccess(hasAccess: boolean) {
    const ids = Array.from(selectedIds);
    batchAccessMutation.mutate({ userIds: ids, hasAccess }, {
      onSuccess: () => setSelectedIds(new Set()),
    });
  }

  function downloadCsv() {
    const header = "Name,Email,Cohort,Access,Journals,Habit Completions,Last Active,Joined";
    const rows = filteredUsers.map(u => [
      csvEscape(getUserName(u)),
      csvEscape(u.personalEmail || u.email),
      csvEscape(u.cohort),
      u.hasAccess ? "Yes" : "No",
      u.journalCount,
      u.habitCompletionCount,
      u.lastActive ? new Date(u.lastActive).toISOString().slice(0, 10) : "",
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "",
    ].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCohortChange(userId: string, value: string) {
    if (value === "__new__") {
      const name = prompt("Enter new cohort name:");
      if (name?.trim()) {
        cohortMutation.mutate({ userId, cohort: name.trim() });
      }
    } else if (value === "__none__") {
      cohortMutation.mutate({ userId, cohort: null });
    } else {
      cohortMutation.mutate({ userId, cohort: value });
    }
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Admin</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="h-4 w-4 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold">{stats.withAccess}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserX className="h-4 w-4 mx-auto mb-1 text-red-500" />
              <div className="text-2xl font-bold">{stats.withoutAccess}</div>
              <div className="text-xs text-muted-foreground">No Access</div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by cohort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="none">No cohort</SelectItem>
              {cohorts.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Select All + Batch Actions */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button size="sm" variant="default" onClick={() => handleBatchAccess(true)}
                  disabled={batchAccessMutation.isPending}>
                  Grant Access
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBatchAccess(false)}
                  disabled={batchAccessMutation.isPending}>
                  Revoke Access
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}

        {/* User List */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No users found</div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map(user => {
              const isMe = user.id === currentUser?.id;
              const isExpanded = expandedUserId === user.id;
              return (
                <Card key={user.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      {!isMe && (
                        <Checkbox
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={() => toggleSelect(user.id)}
                        />
                      )}
                      {isMe && <div className="w-4" />}

                      {/* User info */}
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{getUserName(user)}</span>
                          {isMe && <Badge variant="outline" className="text-xs">You</Badge>}
                          {user.onboardingComplete && (
                            <Badge variant="secondary" className="text-xs">Setup done</Badge>
                          )}
                          {user.cohort && (
                            <Badge variant="secondary" className="text-xs">{user.cohort}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.personalEmail || user.email || "No email"}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{user.journalCount} journals</span>
                          <span>{user.habitCompletionCount} completions</span>
                          {user.lastActive && (
                            <span>Last active {format(new Date(user.lastActive), "MMM d")}</span>
                          )}
                        </div>
                      </div>

                      {/* Expand icon */}
                      <button
                        className="p-1 text-muted-foreground"
                        onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {/* Access toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isMe ? (
                          <Badge variant="outline" className="text-xs">Admin</Badge>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {user.hasAccess ? "On" : "Off"}
                            </span>
                            <Switch
                              checked={user.hasAccess}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ userId: user.id, hasAccess: checked })
                              }
                              disabled={toggleMutation.isPending}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="pl-7 space-y-3 border-t pt-3">
                        {/* Cohort selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Cohort:</span>
                          <Select
                            value={user.cohort || "__none__"}
                            onValueChange={(v) => handleCohortChange(user.id, v)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {cohorts.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                              <SelectItem value="__new__">+ New cohort...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 30-day heatmap */}
                        <div>
                          <span className="text-xs text-muted-foreground">Last 30 days:</span>
                          <ActivityHeatmap userId={user.id} />
                        </div>

                        {/* Details */}
                        <div className="text-xs text-muted-foreground">
                          {user.createdAt && <span>Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</span>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
