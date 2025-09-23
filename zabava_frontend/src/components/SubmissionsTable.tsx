import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SubmissionRecord } from "@/types/dashboard";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export interface SubmissionsTableProps {
  submissions: SubmissionRecord[];
  isLoading?: boolean;
  onToggleVisited?: (submission: SubmissionRecord) => void;
  visitUpdating?: Record<string, boolean>;
  emptyState?: ReactNode;
}

export function SubmissionsTable({
  submissions,
  isLoading = false,
  onToggleVisited,
  visitUpdating = {},
  emptyState,
}: SubmissionsTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-slate-400">Loading submissions...</div>
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        {emptyState ?? "No submissions found"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ticket
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              People
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Price
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Points
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Redemption
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Visit
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {submissions.map((sub, idx) => {
            const key = sub.email ?? String(idx);
            const isUpdating = Boolean(visitUpdating[key]);
            return (
              <tr
              key={key}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-3 py-4 text-sm text-gray-900">{sub.email}</td>
              <td className="px-3 py-4 text-sm text-gray-500">
                {sub.Categories || "N/A"}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500">
                {sub.ticket || "N/A"}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500">
                {sub.numPeople || "N/A"}
              </td>
              <td className="px-3 py-4 text-sm text-right font-medium text-gray-900">
                ${sub.totalPrice || 0}
              </td>
              <td className="px-3 py-4 text-sm text-right font-medium text-green-600">
                {sub.estimatedPoints || 0}
              </td>
              <td className="px-3 py-3 text-center">
                {sub.hasRedemption === "true" || sub.redemptionCode ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto bg-purple-100 text-purple-700 border-purple-200">
                          <Gift className="h-3 w-3" />
                          {sub.redemptionCode ? (
                            <span className="font-mono text-xs">{sub.redemptionCode.slice(0, 10)}...</span>
                          ) : (
                            "Has Reward"
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-semibold">Redemption Details</p>
                          {sub.redemptionCode && (
                            <p className="text-xs">Code: <span className="font-mono">{sub.redemptionCode}</span></p>
                          )}
                          {sub.redemptionReward && (
                            <p className="text-xs">Reward: {sub.redemptionReward}</p>
                          )}
                          {sub.redemptionValue && (
                            <p className="text-xs">Value: {sub.redemptionValue} points</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    sub.used
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  {sub.used ? "Used" : "Pending"}
                </span>
              </td>
              <td className="px-3 py-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      sub.visited
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-orange-100 text-orange-700 border border-orange-200"
                    }`}
                  >
                    {sub.visited ? "Visited" : "Unconfirmed"}
                  </span>
                  {sub.visitedAt ? (
                    <span className="text-xs text-gray-500">
                      {formatDate(sub.visitedAt)}
                    </span>
                  ) : null}
                  {onToggleVisited && !sub.visited ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-fit mt-1"
                      onClick={() => onToggleVisited(sub)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Mark visited"}
                    </Button>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-4 text-sm text-gray-500">
                {formatDate(sub.createdAt)}
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
