import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, UserCheck, UserX } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

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
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

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

        {/* User List */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No users yet</div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <Card key={user.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {user.firstName
                          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                          : user.personalEmail || user.email || user.id.slice(0, 8)}
                      </span>
                      {user.onboardingComplete && (
                        <Badge variant="secondary" className="text-xs shrink-0">Setup done</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {user.personalEmail || user.email || "No email"}
                    </div>
                    {user.createdAt && (
                      <div className="text-xs text-muted-foreground">
                        Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {user.id === currentUser?.id ? (
                      <Badge variant="outline" className="text-xs">You</Badge>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
