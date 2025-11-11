"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import {
  Check,
  CheckCheck,
  Circle,
  Paperclip,
  X,
  Send,
  Loader2,
  Smile,
  ArrowLeft,
  FileIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";

interface Message {
  id: number;
  sender: "me" | "them";
  text: string;
  time: string;
  caption?: string;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  mediaType?:
  | "image"
  | "video"
  | "audio"
  | "document"
  | "application"
  | undefined;
  mediaUrl?: string; // optional URL for the media file
}

export default function ChatPage() {
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null);
  const [message, setMessage] = useState("");
  const [allMessages, setAllMessages] = useState<Record<number, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [sidebarMessages, setSidebarMessages] = useState<Record<number, any>>({});
  const [canStartChat, setCanStartChat] = useState(false); // show template button
  const [chatActive, setChatActive] = useState(false); // show input box
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const userrole = useRoleStore((state) => state?.role);
  const activeUser = useUserStore((state) => state?.user);
  const fallbackUrl = FALLBACK_URL;


  const fetchUnreadCounts = async () => {
    if (!activeUser?.id || !filteredCustomers?.length) return;

    try {
      const responses = await Promise.all(
        filteredCustomers.map(async (customer) => {
          const res = await fetch(
            `/api/unread-messages?senderId=${activeUser.id}&receiverId=${customer.id}`
          );
          if (!res.ok) return { id: customer.id, count: 0 };

          const data = await res.json();
          return { id: customer.id, count: data.count || 0 };
        })
      );

      const unreadMap: Record<number, number> = {};
      responses.forEach((r) => {
        unreadMap[r.id] = r.count;
      });

      setUnreadCounts(unreadMap);
    } catch (error) {
      console.error("❌ Error fetching unread counts:", error);
    }
  };



  const { data: customerData } = useQuery<{
    result: Customer[];
    totalcount: number;
  }>({
    queryKey: ["/api/customers", activeUser],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/customers/user/${activeUser?.id}?role=${userrole?.name}`
      );
      return res.json();
    },
    enabled: !!activeUser?.id && !!userrole?.name,
  });

  const customers = customerData?.result;
  // const filteredCustomers = customers?.filter((customer) => customer.phone);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = async (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "message") {
        const data = payload.data;
        const customer = filteredCustomers?.find(
          (c) => c.phone?.replace(/\D/g, "") === data.from?.replace(/\D/g, "")
        );

        if (!customer) return;
        const userId = customer.id;
        if (selectedUser && userId === selectedUser.id) {
          try {

            await fetch(
              `/api/mark-read-status?senderId=${activeUser?.id}&receiverId=${userId}`,
              { method: "PUT" }
            );
          } catch (error) {
            console.log('error updating status to read')

          }
        }
        const messageTime = new Date(parseInt(data.timestamp) * 1000)
          .toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .toLowerCase();

        let newMessage: any;

        if (data.type === "text") {
          newMessage = {
            id: Date.now(),
            sender: "them",
            text: data.text.body,
            time: messageTime,
          };
        } else if (
          data.type === "image" ||
          data.type === "video" ||
          data.type === "audio" ||
          data.type === "document"
        ) {
          const media = data.image || data.video;
          const mediaType = data.type;
          newMessage = {
            id: Date.now(),
            sender: "them",
            caption: media?.caption || "",
            time: messageTime,
            mediaUrl: data.mediaUrl || "",
            mediaType: mediaType || "null",
          };
        } else {
          return;
        }

        setAllMessages((prev) => ({
          ...prev,
          [userId]: [...(prev[userId] || []), newMessage],
        }));

        setUnreadCounts((prev) => ({
          ...prev,
          [userId]: selectedUser?.id === userId ? 0 : (prev[userId] || 0) + 1,
        }));

        // If this is the selected user, allow input (customer replied)
        if (selectedUser?.id === userId) setChatActive(true);

      } else if (payload.type === "status") {
        const statusData = payload.data;
        const msgId = statusData.id;
        const msgStatus = statusData.status;

        setAllMessages((prev) => {
          const updated = { ...prev };
          for (const userId in updated) {
            updated[userId] = (updated[userId] || []).map((msg) =>
              String(msg.id) === String(msgId)
                ? { ...msg, status: msgStatus }
                : msg
            );
          }
          return updated;
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedUser]);

  // Fetch messages for selected user
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser || !activeUser?.id) return;

      try {
        const res = await fetch(
          `/api/messages?senderId=${activeUser.id}&receiverId=${selectedUser.id}`
        );
        if (!res.ok) throw new Error("Failed to fetch messages");

        const data = await res.json();
        const formattedMessages: Message[] = data.map((msg: any) => {
          const date = new Date(msg.createdAt);
          let hours = date.getUTCHours();
          const minutes = date.getUTCMinutes();
          const ampm = hours >= 12 ? "pm" : "am";
          hours = hours % 12 || 12;

          const time = `${hours}:${minutes
            .toString()
            .padStart(2, "0")} ${ampm}`;
          return {
            id: msg.id,
            sender: msg.direction === "outgoing" ? "me" : "them",
            text: msg.content,
            time,
            status: msg.status,
            mediaType: msg.mediaMimeType
              ? msg.mediaMimeType.split("/")[0]
              : undefined,
            mediaUrl: msg.mediaUrl,
            caption: msg.caption || "",
          };
        });

        setAllMessages((prev) => ({
          ...prev,
          [selectedUser.id]: formattedMessages,
        }));
        setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
      } catch (err) {
        console.error("❌ Error loading chat:", err);
      }
    };

    fetchMessages();
  }, [selectedUser, activeUser?.id]);

  useEffect(() => {
    const fetchLastMessage = async () => {
      if (!selectedUser || !activeUser?.id) return;

      try {
        const res = await fetch(
          `/api/get-last-message?senderId=${activeUser.id}&receiverId=${selectedUser.id}`
        );
        if (!res.ok) throw new Error("Failed to fetch last message");

        const data = await res.json();
        setLastMessage(data);

        const lastTime = new Date(data?.createdAt || null).getTime();

        const now = Date.now();
        const diffHours = (now - lastTime) / (1000 * 60 * 60);

        if (diffHours >= 24) {
          setCanStartChat(true); // show "Start Chat"
          setChatActive(false); // input hidden until customer replies
        } else {
          setCanStartChat(false);
          setChatActive(true); // chat active
        }
      } catch (err) {
        console.error("⚠️ Error fetching last message:", err);
        setCanStartChat(true); // allow start chat if no messages
        setChatActive(false); // input hidden
      }
    };




    fetchLastMessage();
  }, [selectedUser, activeUser?.id, allMessages]);

  const fetchSidebarMessages = async () => {
    if (!activeUser?.id) return;
    try {
      const responses = await Promise.all(
        (filteredCustomers || []).map(async (customer) => {
          const res = await fetch(
            `/api/get-sidebar-message?senderId=${activeUser.id}&receiverId=${customer.id}`
          );
          if (!res.ok) return null;
          const data = await res.json();
          return { id: customer.id, message: data };
        })
      );

      const sidebarMap: Record<number, any> = {};
      responses.forEach((r) => {
        if (r && r.id) sidebarMap[r.id] = r.message;
      });

      setSidebarMessages(sidebarMap);
    } catch (err) {
      console.error("Error fetching sidebar messages:", err);
    }
  };

  const filteredCustomers = useMemo(
    () => customers?.filter((c) => c.phone),
    [customers]
  );
  // add near fetchSidebarMessages (inside the component)
  const fetchSidebarMessageForUser = async (customerId: number) => {
    if (!activeUser?.id) return;
    try {
      const res = await fetch(
        `/api/get-sidebar-message?senderId=${activeUser.id}&receiverId=${customerId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSidebarMessages((prev) => ({ ...prev, [customerId]: data }));
    } catch (err) {
      console.error("Error fetching sidebar message for", customerId, err);
    }
  };

  // ref to keep track of last message id we saw per user
  const prevLastMessageIdRef = useRef<Record<number, number | string | null>>({});
  useEffect(() => {
    if (filteredCustomers?.length && activeUser?.id) {
      fetchUnreadCounts();
    }
  }, [filteredCustomers?.length, activeUser?.id]);


  // run when allMessages updates — only fetch for users whose last message changed
  useEffect(() => {
    if (!activeUser?.id) return;

    // iterate over user keys in allMessages
    Object.keys(allMessages).forEach((key) => {
      const userId = Number(key);
      const msgs = allMessages[userId] || [];
      const lastMsg = msgs[msgs.length - 1] || null;
      const lastId = lastMsg?.id ?? null;

      // only act if last id changed
      if (prevLastMessageIdRef.current[userId] !== lastId) {
        prevLastMessageIdRef.current[userId] = lastId;

        // optional: only fetch if this customer is in filteredCustomers
        const existsInCustomers = filteredCustomers?.some((c) => c.id === userId);
        if (existsInCustomers) {
          fetchSidebarMessageForUser(userId);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages, activeUser?.id]);


  useEffect(() => {
    if (filteredCustomers?.length && activeUser?.id) {
      fetchSidebarMessages();
    }
    // Depend only on stable values
  }, [filteredCustomers?.length, activeUser?.id]);


  // Open file picker
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsModalOpen(true);
    }
    event.target.value = "";
  };
  const handleSendMedia = async () => {
    if (!selectedFile || !selectedUser) return;

    let mediaType: any = "image"; // default fallback

    if (selectedFile.type.startsWith("image/")) {
      mediaType = "image";
    } else if (selectedFile.type.startsWith("video/")) {
      mediaType = "video";
    } else if (selectedFile.type.startsWith("audio/")) {
      mediaType = "audio";
    } else if (
      selectedFile.type === "application/pdf" ||
      selectedFile.type.includes("officedocument") ||
      selectedFile.type.includes("msword")
    ) {
      mediaType = "document";
    }

    // Use numeric tempId (same type used for text path)
    const tempId = Date.now(); // number
    const currentTime = new Date()
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();

    // Create and push a local placeholder message into UI BEFORE the upload
    const newMessage: Message = {
      id: tempId,
      sender: "me",
      text: caption || selectedFile.name,
      time: currentTime,
      status: "sending",
      mediaType,
      mediaUrl: previewUrl || "",
      caption,
    };

    // Ensure we safely append to existing array (handle undefined)
    setAllMessages((prev) => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), newMessage],
    }));

    setIsModalOpen(false);

    // Build form data with string clientId (server expects a string)
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("caption", caption);
    formData.append("to", selectedUser.phone || "null");
    // formData.append("type", selectedFile.type.startsWith("video/") ? "video" : "image");
    formData.append("type", mediaType);
    formData.append("message", caption || "");
    formData.append("senderId", activeUser?.id?.toString() || "");
    formData.append("receiverId", selectedUser.id.toString());
    formData.append("clientId", tempId.toString()); // important: pass string that server will persist
    try {
      const res = await fetch("/api/chat/send-media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to send media");

      const result = await res.json();
      const mediaUrl = result?.data?.mediaUrl;
      const wamid =
        result?.data?.wamid || result?.data?.wamid === 0
          ? result.data.wamid
          : null;

      // Update the UI message: replace the tempId with the wamid (coerce to string if wamid is string)
      setAllMessages((prev) => {
        const updated = { ...prev };
        const arr = updated[selectedUser.id] || [];
        updated[selectedUser.id] = arr.map((msg) =>
          String(msg.id) === String(tempId)
            ? {
              ...msg,
              id: wamid ?? msg.id,
              status: "sent",
              mediaUrl: mediaUrl || msg.mediaUrl,
            }
            : msg
        );
        return updated;
      });

      // cleanup modal/preview
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
    } catch (err) {
      console.error("🚨 Error sending media:", err);

      // mark the placeholder message as failed
      setAllMessages((prev) => {
        const updated = { ...prev };
        updated[selectedUser.id] = (updated[selectedUser.id] || []).map((msg) =>
          String(msg.id) === String(tempId) ? { ...msg, status: "failed" } : msg
        );
        return updated;
      });
    }
  };

  // Send normal message
  const handleSend = async () => {
    if (!message.trim() || !selectedUser) return;

    const tempId = Date.now();
    const currentTime = new Date()
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();

    const newMessage: Message = {
      id: tempId,
      sender: "me",
      text: message,
      time: currentTime,
      status: "sending",
    };

    setAllMessages((prev) => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), newMessage],
    }));

    setMessage("");

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedUser.phone,
          body: message,
          senderId: activeUser?.id,
          receiverId: selectedUser.id,
          clientId: tempId,
        }),
      });

      if (!res.ok) throw new Error("Failed to send/store message");

      const result = await res.json();
      const savedMessage = result.data;
      const serverId = savedMessage?.wamid ?? savedMessage?.id;

      setAllMessages((prev) => {
        const updated = { ...prev };
        updated[selectedUser.id] = (updated[selectedUser.id] || []).map((msg) =>
          String(msg.id) === String(tempId)
            ? { ...msg, id: serverId ?? msg.id, status: "sent" }
            : msg
        );
        return updated;
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setAllMessages((prev) => {
        const updated = { ...prev };
        updated[selectedUser.id] = (updated[selectedUser.id] || []).map((msg) =>
          String(msg.id) === String(tempId) ? { ...msg, status: "failed" } : msg
        );
        return updated;
      });
    }

    setMessage("");
  };

  const handleStartChat = async () => {
    if (!selectedUser || !activeUser?.id) return;
    const tempId = Date.now();
    const currentTime = new Date()
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();

    // Add temporary "template message" in UI
    const newMessage: Message = {
      id: tempId,
      sender: "me",
      text: "Template: custom",
      time: currentTime,
      status: "sending",
    };

    setAllMessages((prev) => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), newMessage],
    }));

    try {
      const res = await fetch("/api/send-template-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedUser.phone,
          senderId: activeUser.id,
          receiverId: selectedUser.id,
          templateName: "custom",
          clientId: tempId.toString(),
        }),
      });

      const result = await res.json();
      const wamid = result?.data.wamid;

      setAllMessages((prev) => ({
        ...prev,
        [selectedUser.id]: prev[selectedUser.id].map((msg) =>
          msg.id === tempId ? { ...msg, id: wamid, status: "sent" } : msg
        ),
      }));

      // Hide button until customer replies
      setCanStartChat(false);
      setChatActive(false);
    } catch (error) {
      console.error("🚨 Error sending template:", error);

      // Mark message as failed
      setAllMessages((prev) => ({
        ...prev,
        [selectedUser.id]: prev[selectedUser.id].map((msg) =>
          String(msg.id) === String(tempId) ? { ...msg, status: "failed" } : msg
        ),
      }));
    }
  };

  const messages = selectedUser ? allMessages[selectedUser.id] || [] : [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: selectedUser ? "auto" : "smooth" });
    }
  }, [messages, selectedUser]);
  return (
    // top-level must be viewport height and prevent page scroll
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left-side app drawer (your other Sidebar component) */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content (column) */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* Header — fixed height, not part of scrollable areas */}
        <div className="flex-shrink-0">
          <DashboardHeader
            userName="Chats"
            subtitle="Manage your Chats here"
            issearch={false}
          />
        </div>

        {/* Main area: two columns, each column will manage its own scrolling */}
        <main className="flex-1 flex w-full h-full overflow-hidden rounded-lg">
          {/* LEFT: Sidebar list column */}
          <div
            className={`${selectedUser ? "hidden" : "flex"} lg:flex w-full lg:w-1/4  flex flex-col h-full`}
          >
            {/* search — fixed at top of this column */}
            <div className="p-4 flex-shrink-0">
              <Input
                placeholder="Search Customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-100"
              />
            </div>

            {/* THIS is the scrollable sidebar list (only this area scrolls) */}
            <ScrollArea className="flex-1 overflow-auto">
              {filteredCustomers
                ?.filter((e) => e.companyName.toLowerCase().includes(searchTerm.toLocaleLowerCase()))
                .map((user) => {
                  const unread = unreadCounts[user.id] || 0;
                  return (
                    <div
                      key={user.id}
                      onClick={async () => {
                        setSelectedUser(user);
                        setUnreadCounts((prev) => ({ ...prev, [user.id]: 0 }));

                        try {
                          await fetch(
                            `/api/mark-read-status?senderId=${activeUser?.id}&receiverId=${user.id}`,
                            { method: "PUT" }
                          );
                        } catch (err) {
                          console.error("❌ Error marking messages read:", err);
                        }
                      }}

                      // onClick={() => {
                      //   setSelectedUser(user);
                      //   setUnreadCounts((prev) => ({ ...prev, [user.id]: 0 }));
                      // }}
                      className={`p-4 shadow-[0_0.5px_1px_rgba(0,0,0,0.1)] cursor-pointer transition 
  ${selectedUser?.id === user.id
                          ? "bg-blue-100 hover:bg-blue-200" // selected user
                          : "hover:bg-gray-100"} // hovered but not selected
`}

                    // className={`p-4 border-b cursor-pointer hover:bg-gray-100 transition ${selectedUser?.id === user.id ? "bg-[#e6f2ff]" : ""}`}
                    >

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8 rounded-full overflow-hidden">
                            <AvatarImage src={user.avatar ? user.avatar : fallbackUrl} alt='avatar' className="w-full h-full object-cover" />
                          </Avatar>
                          <div className="flex flex-col gap-1">
                            <p className="font-medium text-gray-900">
                              {user.companyName}
                            </p>
                            {sidebarMessages[user.id] && (
                              <p
                                className={`text-sm truncate ${selectedUser?.id === user.id ? "text-[#0a7cff]" : "text-gray-400"
                                  }`}
                              >
                                {(() => {
                                  const msg = sidebarMessages[user.id];
                                  if (!msg?.content) return "";

                                  // Determine if it's outgoing
                                  const isOutgoing = msg.direction === "outgoing";

                                  // Limit content to 10 chars
                                  const shortContent =
                                    msg.content.length > 10
                                      ? msg.content.slice(0, 10) + "..."
                                      : msg.content;

                                  return (
                                    <>
                                      {isOutgoing && <strong className="font-semibold">You: </strong>}
                                      {shortContent}
                                    </>
                                  );
                                })()}
                              </p>
                            )}



                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {sidebarMessages[user.id] && (
                            <p
                              className={`text-sm truncate text-gray-400
                                  }`}
                            >
                              {(() => {
                                const msg = sidebarMessages[user.id];
                                if (!msg?.content) return "";

                                const date = new Date(msg.createdAt);
                                let hours = date.getUTCHours();
                                const minutes = date.getUTCMinutes();
                                const ampm = hours >= 12 ? "pm" : "am";
                                hours = hours % 12 || 12;

                                const time = `${hours}:${minutes
                                  .toString()
                                  .padStart(2, "0")} ${ampm}`;
                                return time || "";
                              })()}
                            </p>
                          )}
                          <div>
                            {unread > 0 && (
                              <div className="bg-green-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                                {unread}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
            </ScrollArea>
          </div>

          {/* RIGHT: Chat column */}
          <div className={`${selectedUser ? "flex" : "hidden"} lg:flex flex-1  flex-col h-full mr-2 border border-t-0 border-b-0`}>
            {selectedUser ? (
              <>
                {/* Chat header — fixed inside chat column */}
                <div className="p-4 flex items-center space-x-3 border border-b-gray-200 border-t-0 border-x-0">
                  {/* "Back" button: Only shows on mobile (lg:hidden) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden" // Hides on large screens
                    onClick={() => setSelectedUser(null)} // Go back to list
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>

                    <Avatar className="w-8 h-8 rounded-full overflow-hidden">
                      <AvatarImage src={selectedUser.avatar ? selectedUser.avatar : fallbackUrl} alt='avatar' className="w-full h-full object-cover" />
                    </Avatar>
              
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedUser.companyName}
                    </p>
                  </div>
                </div>

                {/* Message list — scrollable area only */}
                <ScrollArea className="flex-1 overflow-auto space-y-3 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6" >
                  {messages?.map((msg, index) => {
                    const lastMessage = index === messages.length - 1;
                    return (
                      <div ref={lastMessage ? messagesEndRef : null} key={msg.id} className={`flex my-2 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] text-black p-3 rounded-2xl text-sm shadow-sm ${msg.sender === "me"
                            ? "bg-[#dbf8c6] rounded-br-none"
                            : "bg-white rounded-bl-none"
                            }`}
                        >
                          {/* Media Type Handling */}
                          {msg.mediaType === "audio" && msg.mediaUrl ? (
                            <>
                              <audio controls>
                                <source src={msg.mediaUrl} />
                                Your browser does not support the audio element.
                              </audio>
                            </>
                          ) :
                            (msg.mediaType === "application" || msg.mediaType === "document") && msg.mediaUrl ? (
                              <div className="bg-[#056162] rounded-lg p-3 w-44 sm:w-72 text-white shadow-md">
                                <div className="flex items-center space-x-3">
                                  {/* Document Icon */}
                                  <div className="bg-white/20 p-2 rounded-md flex items-center justify-center">
                                    <FileIcon className="w-4 h-4 text-white" />
                                  </div>

                                  {/* File Info */}
                                  <div className="flex-1">
                                    {/* Extract file name from URL */}
                                    <p className="font-medium truncate">
                                      {(() => {
                                        const fileUrl = msg.mediaUrl || "";
                                        const fileName = fileUrl.split("/").pop();
                                        return fileName?.split("-").slice(1).join("-") || "Document";
                                      })()}
                                    </p>

                                    {/* Optional file extension display */}
                                    <p className="text-xs opacity-80">
                                      {msg.mediaUrl ? msg.mediaUrl.split(".").pop()?.toUpperCase() : ""}
                                    </p>
                                  </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex mt-3 space-x-2">
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-[#075E54] hover:bg-[#128C7E] text-white"
                                    onClick={() => window.open(msg.mediaUrl!, "_blank")}
                                  >
                                    Open
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                      const url = msg.mediaUrl!;
                                      const path = url.split('/').slice(4).join('/');
                                      window.open(`/api/download-media/${encodeURIComponent(path)}`)
                                    }
                                    }>
                                    Save file
                                  </Button>


                                </div>
                              </div>
                            )
                              : msg.mediaType === "image" && msg.mediaUrl ? (
                                <div>
                                  <img
                                    src={msg.mediaUrl}
                                    alt="image"
                                    className="rounded-sm"

                                  />
                                </div>
                              ) : msg.mediaType === "video" && msg.mediaUrl ? (
                                <>
                                  <video
                                    src={msg.mediaUrl}
                                    controls
                                    className="rounded-lg mt-2 max-w-full"
                                  />
                                </>
                              ) : msg.text && (

                                <p className="mt-2 text-black rounded-full">{msg.text}</p>
                              )

                          }
                          <p className="mt-2 rounded-full">{msg.caption}</p>

                          {/* Time and Status */}
                          <div className="flex justify-between items-center mt-1 text-xs">
                            <span className="text-gray-600">{msg.time}</span>
                            {msg.sender === "me" && (
                              <span>
                                {msg.status === "sending" ? (
                                  <Loader2 className="ml-2 w-4 h-4  text-[#d6d4c9] animate-spin" />
                                ) : msg.status === "sent" ? (
                                  <Check className="ml-2 w-4 h-4 text-[#d6d4c9]" />
                                ) : msg.status === "read" ? (
                                  // <Circle className="ml-2 w-2 h-2 text-white rounded-full" />
                                  <CheckCheck className="ml-2 w-4 h-4 font-bold text-blue-500 rounded-full" />

                                ) : msg.status === "delivered" ? (
                                  <CheckCheck className="ml-2 w-4 h-4 text-[#d6d4c9] rounded-full" />
                                ) : (
                                  "failed"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>

                {/* Chat input area — fixed at bottom of chat column */}
                {canStartChat ? (
                  <div className="p-4 border-t flex justify-center items-center gap-3 bg-gray-50 flex-shrink-0">
                    <Button onClick={handleStartChat} className="bg-green-600 hover:bg-green-700 text-white font-semibold">Start Chat</Button>
                  </div>
                ) : (
                  chatActive && (
                    <div className="border-t w-full mx-auto gap-3 bg-gray-50 flex-shrink-0">
                      <div
                        //  ref={messagesEndRef}
                        className="p-4 border-t flex items-center gap-3 bg-gray-50">
                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="hidden"
                          id="fileInput"
                          onChange={handleFileSelect}
                        />
                        <div className="flex items-center space-x-2 relative">
                          {/* 📎 File Picker */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              document.getElementById("fileInput")?.click()
                            }
                          >
                            <Paperclip className="w-5 h-5 text-gray-600" />
                          </Button>

                          {/* 😀 Emoji Picker Toggle */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                          >
                            <Smile className="w-5 h-5 text-gray-600" />
                          </Button>

                          {/* Emoji Picker Popover */}
                          {showEmojiPicker && (
                            <div
                              ref={emojiRef}
                              className="absolute bottom-12 left-0 z-50"
                            >
                              <EmojiPicker
                                onEmojiClick={(emojiData: EmojiClickData) => {
                                  setMessage((prev) => prev + emojiData.emoji);
                                }}
                                autoFocusSearch={true}
                              />
                            </div>
                          )}
                        </div>

                        <Input
                          placeholder="Type a message..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSend()}
                          className="flex-1 w-full max-w-[80%]"
                        />
                        <Button
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={message.trim() === ""}
                          onClick={handleSend}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white text-black">
                Select a user to start chatting
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Dialog unchanged */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Media</DialogTitle>
          </DialogHeader>

          {previewUrl && selectedFile && (
            <div className="flex justify-center my-4">
              {selectedFile.type.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Image preview"
                  className="max-h-72 rounded-lg object-contain"
                />
              ) : selectedFile.type.startsWith("video/") ? (
                <video
                  src={previewUrl}
                  controls
                  className="max-h-72 rounded-lg object-contain"
                />
              ) : selectedFile.type.startsWith("audio/") ? (
                <audio controls className="w-full">
                  <source src={previewUrl} type={selectedFile.type} />
                  Your browser does not support the audio element.
                </audio>
              ) : selectedFile.type === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-72 rounded-lg border"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <Paperclip className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{selectedFile.type}</p>
                </div>
              )}
            </div>
          )}
          {selectedFile && !selectedFile.type.startsWith("audio/") && (
            <Input
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          )}
          <DialogFooter className="flex justify-end mt-4 space-x-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMedia}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
