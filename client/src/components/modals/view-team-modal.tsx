import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { TeamWithMembers } from "@shared/schema";
import { format } from "date-fns";
import { FALLBACK_URL } from "@/constants/data";

interface TeamViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamWithMembers | null;
}

interface BlockProps {
  title: string;
  children: React.ReactNode;
}

interface RowProps {
  label: string;
  value?: React.ReactNode;
}

export function TeamViewModal({ isOpen, onClose, team }: TeamViewModalProps) {
  if (!team) return null;


  const formatDate = (ts?: string | Date | null): string =>
    ts ? format(typeof ts === "string" ? new Date(ts) : ts, "PPP p") : "—";

  const Block: React.FC<BlockProps> = ({ title, children }) => (
    <div className="mb-6 p-4 border rounded-lg shadow-sm w-full">
      <h3 className="font-semibold text-sm text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1 text-sm max-h-60 overflow-y-auto">{children}</div>
    </div>
  );

  // const Row: React.FC<RowProps> = ({ label, value }) => (
  //   <div className="flex justify-between py-1 border-b last:border-b-0">
  //     <span className="text-muted-foreground">{label}</span>
  //   </div>
  // );
  const Row: React.FC<RowProps> = ({ label, value }) => (
    <div className="flex justify-between py-1 border-b last:border-b-0">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="text-foreground text-right break-words max-w-[60%]">
        {value ?? "—"}
      </span>
    </div>
  );


  // Separate members by role
  const associates = team.members?.filter((m) => m.user.userType === "associate") || [];
  const managers = team.members?.filter((m) => m.user.userType === "manager") || [];
  const teamleads = team.members?.filter((m) => m.user.userType === "team-lead") || [];

  const renderMembers = (members: typeof team.members) => {
    if (!members || members.length === 0) return <p className="text-sm text-gray-500">None</p>;
    return members.map((m) => <Row key={m.userId} label={m.user.username} />);
  };
  const fallbackUrl = FALLBACK_URL;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-6 overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex flex-col gap-2">
            <div className="w-12 h-12 rounded-full shadow-sm border overflow-hidden flex items-center justify-center">
              <img src={team.avatar ? team.avatar : fallbackUrl} alt="avatar" className="object-cover " />
            </div>
            <p className="text-2xl">
              {team.name}
            </p>
          </DialogTitle>
          <DialogDescription>
            Team created on {formatDate(team.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-y-6 text-sm">
          {/* BASIC INFO */}
          <Block title="Basic Information">
            <Row label="Team Name" value={team.name} />
            <Row label="Description" value={team.description} />
          </Block>

          {/* MEMBERS */}
          <Block title={`Associates (${associates.length})`}>{renderMembers(associates)}</Block>
          <Block title={`Team Leads (${teamleads.length})`}>{renderMembers(teamleads)}</Block>
          <Block title={`Managers (${managers.length})`}>{renderMembers(managers)}</Block>

          {/* TIMESTAMPS */}
          <Block title="Timestamps">
            <Row label="Created At" value={formatDate(team.createdAt)} />
            {team.updatedAt &&
              team.createdAt &&
              new Date(team.updatedAt).getTime() !== new Date(team.createdAt).getTime() && (
                <Row label="Updated At" value={formatDate(team.updatedAt)} />
              )}
          </Block>
        </div>

        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground text-center">
          Team #{team.id} — last updated {formatDate(team.updatedAt)}
        </p>
      </DialogContent>
    </Dialog>
  );
}
