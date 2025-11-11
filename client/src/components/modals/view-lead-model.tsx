import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lead } from "@shared/schema";
import { format } from "date-fns";

interface LeadViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

interface BlockProps {
  title: string;
  children: React.ReactNode;
}

interface RowProps {
  label: string;
  value?: React.ReactNode;
}

const statusStyles = {
  new: "bg-blue-100 text-blue-800",
  qualified: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  default: "bg-gray-100 text-gray-800",
};

export function LeadViewModal({ isOpen, onClose, lead }: LeadViewModalProps) {
  if (!lead) return null;

  const formatMoney = (val?: string | number | null): string =>
    val ? `$${Number(val).toLocaleString()}` : "—";

  const formatDate = (ts?: string | Date | null): string =>
    ts ? format(typeof ts === "string" ? new Date(ts) : ts, "PPP p") : "—";

  const Block: React.FC<BlockProps> = ({ title, children }) => (
    <div className="mb-6 p-4 border rounded-lg shadow-sm">
      <h3 className="font-semibold text-sm text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );

  const Row: React.FC<RowProps> = ({ label, value }) => (
    <div className="flex justify-between py-1 border-b last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* */}
      <DialogContent className="max-w-2xl p-6 flex flex-col max-h-[90vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl">{lead.name}</DialogTitle>
          <DialogDescription>
            Lead created on {formatDate(lead.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {/* */}
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="grid md:grid-cols-2 gap-x-6 text-sm">
            {/* BASIC INFO */}
            <Block title="Basic Information">
              <Row label="Name" value={lead.name} />
              <Row label="Email" value={lead.email} />
              <Row label="Phone" value={lead.phone} />
              <Row label="Source" value={lead.source} />
              <Row label="Status" value={lead.status} />
              <Row label="Value" value={formatMoney(lead.value)} />
            </Block>

            {/* RELATIONSHIPS */}
            <Block title="Relationships">
              <Row label="Customer" value={lead.companyName} />
              <Row label="Assigned User" value={lead.assignedUserName} />
              <Row label="Created By" value={lead.createdByUserName} />
              <Row
                label="Contact"
                value={
                  `${lead.pointOfContactFirstName ?? ""} ${
                    lead.pointOfContactLastName ?? ""
                  }`.trim() || "—"
                }
              />
            </Block>

            {/* TIMESTAMPS */}
            <Block title="Timestamps">
              <Row label="Created At : " value={formatDate(lead.createdAt)} />

              {lead.updatedAt &&
                lead.createdAt &&
                new Date(lead.updatedAt).getTime() !==
                  new Date(lead.createdAt).getTime() && (
                  <Row label="Updated At" value={formatDate(lead.updatedAt)} />
                )}
            </Block>

            {/* EXTRA */}
            <Block title="Notes & Tags">
              <Row label="Notes : " value={lead.notes} />
              <div>
                <span className="text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(lead.tags || []).map((t) => (
                    <Badge key={t} variant="outline" className="mr-1 mb-1">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </Block>
          </div>
        </div>

        {/* This footer part will now stay at the bottom */}
        <div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground text-center">
            Lead #{lead.id} — last updated {formatDate(lead.updatedAt)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
