import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Send, Users, User, Clock, AlertCircle, Crown, Sparkles } from "lucide-react";
import { User as UserType } from "@shared/schema";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export default function Chat() {
  const [activeTab, setActiveTab] = useState("team");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState<Record<number, Message[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const currentUserId = 1;

  // Filter only active users
  const activeUsers = users.filter(user => user.isActive);

  const teamUsers = activeUsers.filter(user =>
    !user.rolename?.toLowerCase().includes("client") &&
    user.id !== currentUserId
  );

  const clientUsers = activeUsers.filter(user =>
    user.rolename?.toLowerCase().includes("client")
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, selectedUser]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedUser) return;

    const newMessage: Message = {
      id: Date.now(),
      senderId: currentUserId,
      receiverId: selectedUser.id,
      content: message.trim(),
      timestamp: new Date(),
      isRead: false,
    };

    setConversations(prev => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), newMessage]
    }));
    setMessage("");
    handleSendMessageApi(newMessage);
  };

  const handleSendMessageApi = (message: Message) => {
    console.log("Sending message:", message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentConversation = selectedUser ? conversations[selectedUser.id] || [] : [];

  const getUnreadCount = (userId: number) => {
    return conversations[userId]?.filter(msg =>
      msg.receiverId === currentUserId && !msg.isRead
    ).length || 0;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserInitials = (user: UserType) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
      user.username?.[0]?.toUpperCase() || 'U';
  };

  // Sort users with selected user on top
  const sortUsersWithSelectedFirst = (users: UserType[]) => {
    if (!selectedUser) return users;

    return [...users].sort((a, b) => {
      if (a.id === selectedUser.id) return -1;
      if (b.id === selectedUser.id) return 1;
      return 0;
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Chat" subtitle="Connect with your team and clients" />
        <main className="flex-1 overflow-y-auto p-6">
          <Card className="w-full h-full flex flex-col shadow-lg">
            <CardContent className="flex-1 flex flex-col p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-6 pt-6 pb-2">
                  <TabsList className="grid grid-cols-2 w-64">
                    <TabsTrigger value="team" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team
                    </TabsTrigger>
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Clients
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex flex-1 border-t">
                  <div className="w-1/3 border-r bg-gray-50">
                    <TabsContent value="team" className="m-0 h-full">
                      <ScrollArea className="h-full">
                        {teamUsers.length > 0 ? (
                          sortUsersWithSelectedFirst(teamUsers).map(user => (
                            <div
                              key={user.id}
                              className={`flex items-center p-4 border-b cursor-pointer transition-all ${selectedUser?.id === user.id
                                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                                  : "hover:bg-gray-100"
                                }`}
                              onClick={() => setSelectedUser(user)}
                            >
                              <div className="relative">
                                <Avatar className="h-10 w-10 mr-3 shadow-sm">
                                  <AvatarImage src="" />
                                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                                    {getUserInitials(user)}
                                  </AvatarFallback>
                                </Avatar>
                                {user.id === selectedUser?.id && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5">
                                    <Crown className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <p className="font-medium truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  {user.rolename?.toLowerCase().includes("admin") && (
                                    <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800">
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                              </div>
                              {getUnreadCount(user.id) > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                  {getUnreadCount(user.id)}
                                </Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No team members found
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="clients" className="m-0 h-full">
                      <ScrollArea className="h-full">
                        {clientUsers.length > 0 ? (
                          sortUsersWithSelectedFirst(clientUsers).map(user => (
                            <div
                              key={user.id}
                              className={`flex items-center p-4 border-b cursor-pointer transition-all ${selectedUser?.id === user.id
                                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                                  : "hover:bg-gray-100"
                                }`}
                              onClick={() => setSelectedUser(user)}
                            >
                              <div className="relative">
                                <Avatar className="h-10 w-10 mr-3 shadow-sm">
                                  <AvatarImage src="" />
                                  <AvatarFallback className="bg-gradient-to-r from-green-400 to-green-600 text-white">
                                    {getUserInitials(user)}
                                  </AvatarFallback>
                                </Avatar>
                                {user.id === selectedUser?.id && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5">
                                    <Crown className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                              </div>
                              {getUnreadCount(user.id) > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                  {getUnreadCount(user.id)}
                                </Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-500">
                            <div className="bg-gray-100 rounded-full p-3 inline-flex items-center justify-center mb-3">
                              <AlertCircle className="h-6 w-6" />
                            </div>
                            <p className="font-medium">Coming Soon</p>
                            <p className="text-sm mt-1">Client messaging will be available soon</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </div>

                  <div className="flex-1 flex flex-col">
                    {selectedUser ? (
                      <>
                        <div className="p-4 border-b flex items-center bg-white">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                              {getUserInitials(selectedUser)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium">
                                {selectedUser.firstName} {selectedUser.lastName}
                              </p>
                              {selectedUser.rolename?.toLowerCase().includes("admin") && (
                                <Sparkles className="h-4 w-4 ml-2 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {selectedUser.rolename || "User"} • Active now
                            </p>
                          </div>
                        </div>

                        <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-white to-gray-50">
                          {currentConversation.length > 0 ? (
                            <div className="space-y-4">
                              {currentConversation.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"
                                    }`}
                                >
                                  <div
                                    className={`max-w-xs lg:max-w-md rounded-xl px-4 py-2 shadow-sm ${msg.senderId === currentUserId
                                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                        : "bg-white border"
                                      }`}
                                  >
                                    <p>{msg.content}</p>
                                    <p
                                      className={`text-xs mt-1 text-right ${msg.senderId === currentUserId
                                          ? "text-blue-100"
                                          : "text-gray-500"
                                        }`}
                                    >
                                      {formatTime(msg.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center flex-col text-gray-400 p-8">
                              <div className="bg-blue-50 rounded-full p-4 mb-4">
                                <Clock className="h-8 w-8 text-blue-500" />
                              </div>
                              <h3 className="font-medium text-lg mb-1">No messages yet</h3>
                              <p className="text-sm">Start a conversation with {selectedUser.firstName}</p>
                            </div>
                          )}
                        </ScrollArea>

                        {/* Message input */}
                        <div className="p-4 border-t bg-white">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type a message..."
                              value={message}
                              onChange={e => setMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              className="rounded-lg"
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={!message.trim()}
                              size="icon"
                              className="rounded-lg bg-blue-600 hover:bg-blue-700"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 text-gray-500">
                        <div className="text-center p-8 max-w-md">
                          <div className="bg-white rounded-full p-4 inline-flex items-center justify-center shadow-sm mb-4">
                            <Users className="h-8 w-8 text-blue-500" />
                          </div>
                          <h3 className="font-medium text-xl mb-2">Welcome to Chat</h3>
                          <p className="mb-4">Select a team member or client to start a conversation</p>
                          <div className="bg-white rounded-lg p-4 text-left text-sm border">
                            <p className="font-medium mb-2 flex items-center">
                              <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                              Tip
                            </p>
                            <p>Only active users are shown in your chat list</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}