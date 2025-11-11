import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Settings, Send, Inbox, Edit, Clock, CheckCircle2, AlertCircle, ChevronDown, Mail } from "lucide-react";
import { Email, EmailConfiguration } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailIntegrationModal } from "@/components/modals/email-integration-modal";
import { SendMailModel } from "@/components/modals/send-email-model";
import { useAuth } from "@/hooks/use-auth";

export default function Emails() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const { toast } = useToast(); 
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const { user } = useAuth();

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
    enabled: !!user,
  });

  const { data: emailConfig, isLoading: isConfigLoading } = useQuery<EmailConfiguration | null>({
    queryKey: ["/api/email-config"],
    enabled: !!user,
  });

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.fromEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    switch (activeTab) {
      case "inbox":
        return matchesSearch && email.direction === "incoming";
      case "sent":
        return matchesSearch && email.direction === "outgoing" && email.status === "sent";
      case "drafts":
        return matchesSearch && email.status === "draft";
      case "scheduled":
        return matchesSearch && email.scheduledAt;
      default:
        return matchesSearch;
    }
  });

  const handleComposeEmail = () => {
    setIsSendEmailModalOpen(true);
    setSelectedEmail(null);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderConfigDetails = () => {
    if (!emailConfig) return null;
    
    return (
      <div className="mt-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500">Provider</p>
            <p className="font-medium">{emailConfig.provider}</p>
          </div>
          <div>
            <p className="text-gray-500">SMTP Server</p>
            <p className="font-medium">{emailConfig.smtpHost}:{emailConfig.smtpPort}</p>
          </div>
          <div>
            <p className="text-gray-500">Security</p>
            <p className="font-medium">Unknown</p>
          </div>
          <div>
            <p className="text-gray-500">Authentication</p>
            <p className="font-medium">{emailConfig.authMethod || "Username/Password"}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-gray-500">Last Tested</p>
          <p className="font-medium">
            {emailConfig.lastTestedAt 
              ? new Date(emailConfig.lastTestedAt).toLocaleString() 
              : "Never tested"}
            {emailConfig.lastTestStatus && (
              <Badge variant={emailConfig.lastTestStatus === "success" ? "success" : "destructive"} className="ml-2">
                {emailConfig.lastTestStatus === "success" ? "Success" : "Failed"}
              </Badge>
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Email Integration" subtitle="Manage your email communications" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle>Your Email Configuration</CardTitle>
                    <CardDescription>
                      {emailConfig 
                        ? `Connected to ${emailConfig.provider} (${emailConfig.email})`
                        : "Set up your email configuration to send and receive emails"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {emailConfig && (
                      <Badge variant={emailConfig.isActive ? "success" : "destructive"} className="px-3 py-1">
                        {emailConfig.isActive ? (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        ) : (
                          <AlertCircle className="w-4 h-4 mr-1" />
                        )}
                        {emailConfig.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}
                    <Button 
                      onClick={() => setIsConfigModalOpen(true)}
                      variant={emailConfig ? "outline" : "default"}
                      className={!emailConfig ? "bg-primary hover:bg-primary/90" : ""}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {emailConfig ? "Update Configuration" : "Setup Email"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {emailConfig && (
                <CardContent>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary -ml-2"
                    onClick={() => setShowConfigDetails(!showConfigDetails)}
                  >
                    <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showConfigDetails ? 'rotate-180' : ''}`} />
                    {showConfigDetails ? 'Hide details' : 'Show details'}
                  </Button>
                  {showConfigDetails && renderConfigDetails()}
                </CardContent>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Email Management</CardTitle>
                <Button 
                  disabled={!emailConfig} 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={handleComposeEmail}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Compose Email
                </Button>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search emails by subject, sender or recipient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="inbox" className="flex items-center space-x-2">
                    <Inbox className="w-4 h-4" />
                    <span>Inbox</span>
                    {emails.some(e => e.direction === "incoming") && (
                      <Badge variant="secondary" className="px-1.5 py-0.5">
                        {emails.filter(e => e.direction === "incoming").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Sent</span>
                    {emails.some(e => e.direction === "outgoing" && e.status === "sent") && (
                      <Badge variant="secondary" className="px-1.5 py-0.5">
                        {emails.filter(e => e.direction === "outgoing" && e.status === "sent").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="drafts" className="flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Drafts</span>
                    {emails.some(e => e.status === "draft") && (
                      <Badge variant="secondary" className="px-1.5 py-0.5">
                        {emails.filter(e => e.status === "draft").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="scheduled" className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Scheduled</span>
                    {emails.some(e => e.scheduledAt) && (
                      <Badge variant="secondary" className="px-1.5 py-0.5">
                        {emails.filter(e => e.scheduledAt).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[25%]">Subject</TableHead>
                            <TableHead className="w-[20%]">From</TableHead>
                            <TableHead className="w-[20%]">To</TableHead>
                            <TableHead className="w-[15%]">Date</TableHead>
                            <TableHead className="w-[10%]">Status</TableHead>
                            <TableHead className="w-[10%] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmails.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8">
                                <div className="text-gray-500 flex flex-col items-center">
                                  {!emailConfig ? (
                                    <>
                                      <Mail className="w-12 h-12 mb-4 text-gray-400" />
                                      <p>Set up your email configuration to start sending and receiving emails</p>
                                    </>
                                  ) : searchTerm ? (
                                    "No emails match your search."
                                  ) : activeTab === "inbox" ? (
                                    "Your inbox is empty"
                                  ) : activeTab === "sent" ? (
                                    "You haven't sent any emails yet"
                                  ) : activeTab === "drafts" ? (
                                    "You don't have any drafts"
                                  ) : (
                                    "You don't have any scheduled emails"
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredEmails.map((email) => (
                              <TableRow key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    {email.important && (
                                      <span className="text-yellow-500 mr-2">!</span>
                                    )}
                                    {email.subject || "(No subject)"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm truncate">
                                    {email.fromEmail}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-sm truncate">
                                      {email.toEmail}
                                    </span>
                                    {email.cc && (
                                      <span className="text-xs text-gray-500 truncate">
                                        CC: {email.cc}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {email.sentAt 
                                    ? formatDate(email.sentAt) 
                                    : email.scheduledAt 
                                      ? `Scheduled: ${formatDate(email.scheduledAt)}`
                                      : formatDate(email.createdAt)
                                  }
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${getStatusColor(email.status)} capitalize`}>
                                    {email.status || "unknown"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmail(email);
                                      setIsSendEmailModalOpen(true);
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
      
      <EmailIntegrationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={emailConfig || undefined}
      />
      <SendMailModel
        isOpen={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        config={emailConfig || undefined}
      />
    </div>
  );
}