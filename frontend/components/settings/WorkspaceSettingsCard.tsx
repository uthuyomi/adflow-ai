"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOperationsMutations, useWorkspaceSettings } from "@/hooks/use-operations";

export function WorkspaceSettingsCard() {
  const settings = useWorkspaceSettings();
  const mutations = useOperationsMutations();
  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [defaultView, setDefaultView] = useState("/dashboard");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [notifications, setNotifications] = useState(true);
  useEffect(() => {
    if (!settings.data) return;
    setTimezone(settings.data.timezone); setDefaultView(settings.data.default_view); setDensity(settings.data.display_density);
    setNotifications(settings.data.notification_preferences.enabled !== false);
  }, [settings.data]);
  const save = async () => {
    try {
      await mutations.updateSettings.mutateAsync({ timezone, default_view: defaultView, display_density: density, notification_preferences: { enabled: notifications } });
      toast.success("Workspace settings saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
  };
  return <Card><CardHeader><CardTitle>Workspace operations</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
    <label className="space-y-2 text-sm"><span>Timezone</span><Input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
    <label className="space-y-2 text-sm"><span>Default view</span><Input value={defaultView} onChange={(event) => setDefaultView(event.target.value)} /></label>
    <label className="space-y-2 text-sm"><span>Display density</span><select className="h-10 w-full rounded-md border bg-background px-3" value={density} onChange={(event) => setDensity(event.target.value as "compact" | "comfortable")}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
    <label className="flex items-center gap-2 text-sm"><input checked={notifications} onChange={(event) => setNotifications(event.target.checked)} type="checkbox" />Enable notifications</label>
    <Button className="md:col-span-2" disabled={mutations.updateSettings.isPending} onClick={save}>Save workspace settings</Button>
  </CardContent></Card>;
}
