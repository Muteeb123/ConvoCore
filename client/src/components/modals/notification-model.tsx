import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/stores/useRoleStore";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  Calendar,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  User, // Import Check icon
} from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Import useMutation and queryClient
import { apiRequest } from "@/lib/queryClient"; // Import apiRequest
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  entityType: string | null;
  entityId: number | null;
  createdAt: Date;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { user } = useUserStore();
  const { toast } = useToast(); // Initialize toast
  const queryClient = useQueryClient(); // Initialize queryClient
  const [unreadNotifications, setUnreadNotifications] = useState<
    Notification[]
  >([]);
  const [readNotifications, setReadNotifications] = useState<Notification[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("unread");
  const [hasMoreReadNotifications, setHasMoreReadNotifications] =
    useState(true);

  // --- MUTATIONS ---
//vvgv
  // ✅ Mutation for marking all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not found");
      const res = await apiRequest("PUT", `/api/notifications/mark-all-read`, {
        userId: user.id,
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      // Optimistically update UI
      const nowRead = unreadNotifications.map((n) => ({ ...n, isRead: true }));
      setReadNotifications([...nowRead, ...readNotifications]);
      setUnreadNotifications([]);
      toast({
        title: "Success",
        description: "All notifications marked as read.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ Mutation for deleting all notifications for the user
  const deleteMyNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not found");
      const res = await apiRequest(
        "DELETE",
        `/api/notifications/user/${user.id}`
      );
      if (!res.ok) throw new Error("Failed to delete notifications");
      return res.json();
    },
    onSuccess: () => {
      setUnreadNotifications([]);
      setReadNotifications([]);
      toast({
        title: "Notifications Cleared",
        description: "All your notifications have been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // --- EFFECTS ---

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null; // Timer for deletion

    if (isOpen && user) {
      fetchAllNotifications();

      // ✅ Start 5-minute timer to delete all notifications
      timer = setTimeout(() => {
        console.log(
          "5 minutes elapsed. Deleting all notifications for user:",
          user.id
        );
        deleteMyNotificationsMutation.mutate();
      }, 300000); // 5 * 60 * 1000 = 300,000 ms
    } else {
      // Reset state when modal closes
      setUnreadNotifications([]);
      setReadNotifications([]);
      setHasMoreReadNotifications(true);
    }

    // ✅ Cleanup function to clear the timer if the modal is closed
    return () => {
      if (timer) {
        console.log("Closing modal, clearing delete timer.");
        clearTimeout(timer);
      }
    };
  }, [isOpen, user]); // Rerun effect when modal opens or user changes

  const fetchAllNotifications = async () => {
    try {
      setIsLoading(true);
      const [unreadResponse, readResponse] = await Promise.all([
        fetch(`/api/notifications-unread`), // Assuming this endpoint knows the user
        fetch(`/api/notifications-read-with-limit`), // Assuming this endpoint knows the user
      ]);

      if (unreadResponse.ok) {
        const unreadData = await unreadResponse.json();
        setUnreadNotifications(unreadData);
      }

      if (readResponse.ok) {
        const readData = await readResponse.json();
        setReadNotifications(readData);
        if (readData.length < 10) {
          setHasMoreReadNotifications(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllReadNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications-read`); // Assuming this knows the user
      if (response.ok) {
        const data = await response.json();
        setReadNotifications(data);
        setHasMoreReadNotifications(false);
      }
    } catch (error) {
      console.error("Failed to fetch all read notifications:", error);
    }
  };

  const toggleReadStatus = async (id: number, isCurrentlyRead: boolean) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !isCurrentlyRead }),
      });

      if (response.ok) {
        // Optimistic UI update
        if (isCurrentlyRead) {
          const notification = readNotifications.find((n) => n.id === id);
          if (notification) {
            setReadNotifications(readNotifications.filter((n) => n.id !== id));
            setUnreadNotifications([
              { ...notification, isRead: false },
              ...unreadNotifications,
            ]);
          }
        } else {
          const notification = unreadNotifications.find((n) => n.id === id);
          if (notification) {
            setUnreadNotifications(
              unreadNotifications.filter((n) => n.id !== id)
            );
            setReadNotifications([
              { ...notification, isRead: true },
              ...readNotifications,
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to update notification status:", error);
    }
  };

  const unreadCount = unreadNotifications.length;
  const totalCount = unreadCount + readNotifications.length; // Total count

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="pb-4 border-b px-6 pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {/* ✅ Updated Badge to show total count */}
              {totalCount > 0 && (
                <Badge className="bg-blue-100 text-blue-800">
                  {totalCount} Total
                </Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue="unread"
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 px-6">
            <TabsTrigger value="unread">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="read">
              Read{" "}
              {readNotifications.length > 0 && `(${readNotifications.length})`}{" "}
              {/* Show count only if > 0 */}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {isLoading ? (
              <div className="text-center py-8">Loading notifications...</div>
            ) : (
              <>
                <TabsContent value="unread" className="space-y-3 mt-0">
                  {/* ✅ "Mark all as read" Button */}
                  {unreadNotifications.length > 0 && (
                    <div className="flex justify-end pt-4 pb-2 border-b">
                      <Button
                        variant="link"
                        size="sm"
                        className="text-blue-600"
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {markAllAsReadMutation.isPending
                          ? "Marking..."
                          : "Mark all as read"}
                      </Button>
                    </div>
                  )}
                  {unreadNotifications.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 py-8">
                      No unread notifications
                    </div>
                  ) : (
                    unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onToggleRead={() =>
                          toggleReadStatus(notification.id, notification.isRead)
                        }
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="read" className="space-y-3 mt-0">
                  {readNotifications.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 py-8">
                      No read notifications
                    </div>
                  ) : (
                    <>
                      {readNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onToggleRead={() =>
                            toggleReadStatus(
                              notification.id,
                              notification.isRead
                            )
                          }
                        />
                      ))}
                      {hasMoreReadNotifications && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            onClick={fetchAllReadNotifications}
                            className="flex items-center gap-2"
                          >
                            <ChevronDown className="w-4 h-4" />
                            Load more notifications
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// --- NotificationItem Component (Unchanged) ---
interface NotificationItemProps {
  notification: Notification;
  onToggleRead: () => void;
}

function NotificationItem({
  notification,
  onToggleRead,
}: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case "warning":
        return (
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        );
      case "error":
        return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const formatDate = (date: Date) => {
    // Format date to be more readable, e.g., "Nov 4, 2025, 11:45 PM"
    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-all duration-200 ${
        notification.isRead
          ? "bg-gray-50 hover:bg-gray-100"
          : "bg-blue-50 border-blue-200 hover:bg-blue-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-medium ${
                notification.isRead ? "text-gray-700" : "text-gray-900"
              } break-words`}
            >
              {notification.title}
            </h4>
            <button
              onClick={onToggleRead}
              className="ml-2 p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
              title={notification.isRead ? "Mark as unread" : "Mark as read"}
            >
              {notification.isRead ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-blue-500" />
              )}
            </button>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600 break-words whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDate(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
