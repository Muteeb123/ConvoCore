import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A skeleton loader for the Leads table.
 * It mimics the layout of the table header, rows, and pagination.
 */
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          {/* 1. Table Header (Static) */}
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Probability</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          {/* 2. Skeleton Table Body */}
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={`skeleton-row-${index}`}>
                {/* Name */}
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
                {/* Email */}
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                {/* Company */}
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                {/* Status */}
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                {/* Value */}
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                {/* Probability */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </TableCell>
                {/* Source */}
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                {/* Ownership */}
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                {/* Actions */}
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-10 rounded" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 3. Skeleton Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        {/* Showing X to Y of Z */}
        <Skeleton className="h-4 w-48" />
        {/* Pagination Buttons */}
        <div className="flex items-center space-x-1">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </>
  );
}
