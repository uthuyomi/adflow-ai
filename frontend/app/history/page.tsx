"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useChangeHistory } from "@/hooks/use-change-history";

export default function HistoryPage() {
  const history = useChangeHistory();
  if (history.isLoading) return <PageSkeleton />;
  if (history.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Change History" description="Review every create, update, and delete saved for the logged-in user." />
      {history.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  <TableCell>{item.entity_type}</TableCell>
                  <TableCell><Badge>{item.action}</Badge></TableCell>
                  <TableCell>{item.summary || "-"}</TableCell>
                  <TableCell>{item.reason || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="No change history" description="History is written automatically when registered entities change." />
      )}
    </div>
  );
}
