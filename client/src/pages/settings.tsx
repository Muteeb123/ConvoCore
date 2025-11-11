import { useState, useEffect } from "react"; // Added useEffect if needed later
import { useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { Button } from "@/components/ui/button";
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea"; // Textarea not used in provided code
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Globe,
  // Palette, // Icon not used
  Database,
  Mail,
  Save,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
// import e from "express"; // Removed unused import

export default function Settings() {
  const [newpassword, setpassword] = useState("");
  const [confirmpassword, setconfirmpassword] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth(); // Assuming useAuth fetches the current user details initially
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Settings State - Initialize with user data or defaults
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
  });

  const SAVE_ICON_URI = <Save className="w-full h-full" />;
  const REFRESH_ICON_URI = <RefreshCw className="w-full h-full" />;

  // Update profileData when user object becomes available or changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        username: user.username || "",
      });
    }
  }, [user]); // Dependency on user object

  // Notification Settings State (Example state, adjust as needed)
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskReminders: true,
    leadNotifications: true,
    meetingReminders: true,
    weeklyReports: false,
    marketingEmails: false,
  });

  // System Settings State (Example state, adjust as needed)
  const [systemSettings, setSystemSettings] = useState({
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12",
    language: "en",
    currency: "USD",
  });

  // Security Settings State (Example state, adjust as needed)
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: "24",
    passwordExpiry: "90",
    loginNotifications: true,
  });

  // --- Mutations ---
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      // Ensure user?.id is available before making the request
      if (!user?.id) throw new Error("User ID not available for update.");
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to update profile." }));
        throw new Error(errorData.message || "Failed to update profile.");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // 'data' here is the response from the API
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Invalidate user query if you have one
      // Optionally update the user state in useAuth or Zustand store if needed
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!user?.id)
        throw new Error("User ID not available for password update.");
      const res = await apiRequest("PUT", `/api/users/${user.id}`, {
        password,
      }); // Send only password
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to update password." }));
        throw new Error(errorData.message || "Failed to update password.");
      }
      return await res.json();
    },
    onSuccess: () => {
      setpassword(""); // Clear fields on success
      setconfirmpassword("");
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    },
  });

  // --- Handlers ---
  const handleUpdatePassword = async () => {
    if (!newpassword) {
      toast({
        title: "Error",
        description: "New password cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (newpassword !== confirmpassword) {
      toast({
        title: "Error",
        description: "New Password and Confirm Password do not match.",
        variant: "destructive",
      });
      return; // Stop execution if passwords don't match
    }
    await updatePasswordMutation.mutateAsync(newpassword);
  };

  const handleProfileSave = async () => {
    // Basic validation example
    if (
      !profileData.firstName ||
      !profileData.lastName ||
      !profileData.email ||
      !profileData.username
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all profile fields.",
        variant: "destructive",
      });
      return;
    }
    await updateProfileMutation.mutateAsync(profileData);
  };

  // Placeholder save handlers for other sections
  const handleNotificationSave = () => {
    console.log("Saving notification settings:", notificationSettings);
    // TODO: Implement mutation to save notification settings
    toast({
      title: "Notifications updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSystemSave = () => {
    console.log("Saving system settings:", systemSettings);
    // TODO: Implement mutation to save system settings
    toast({
      title: "System settings updated",
      description: "Your system preferences have been saved.",
    });
  };

  const handleSecuritySave = () => {
    console.log("Saving security settings:", securitySettings);
    // TODO: Implement mutation to save security settings
    toast({
      title: "Security settings updated",
      description: "Your security preferences have been saved.",
    });
  };

  // --- Main Return ---
  return (
    // 1. Root container: Full screen, no browser scrolling
    <div className="flex h-screen w-full overflow-hidden">
      {/* 2. Sidebar: Fixed width, uses its own internal scrolling */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. Main Content Area: Fills remaining space, flex column */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* 4. Fixed Header: Stays at the top */}
        <DashboardHeader
          userName="Settings"
          subtitle="Manage your account and system preferences"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden ">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          <div className="max-w-4xl mx-auto">
            {" "}
            {/* Max width for content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* 1. ADD THIS WRAPPER to center the TabsList */}
              <div className="flex justify-center">
                {/* 2. REMOVE "grid w-full grid-cols-1 place-items-center" */}
                <TabsList className="mb-6">
                  {" "}
                  {/* Responsive grid */}
                  <TabsTrigger
                    value="profile"
                    className="flex items-center justify-center space-x-2"
                  >
                    {" "}
                    {/* Centered */}
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </TabsTrigger>
                  {/* Only render other tabs if needed */}
                  {/* <TabsTrigger
                  value="notifications"
                  className=" items-center justify-center space-x-2"
                >
                  <Bell className="w-4 h-4 hidden" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className=" items-center justify-center space-x-2"
                >
                  <Shield className="w-4 h-4 hidden" />
                  <span>Security</span>
                </TabsTrigger>
                <TabsTrigger
                  value="system"
                  className=" items-center justify-center space-x-2"
                >
                  <SettingsIcon className="w-4 h-4 hidden" />
                  <span>System</span>
                </TabsTrigger>
                <TabsTrigger
                  value="integrations"
                  className=" items-center justify-center space-x-2"
                >
                  <Globe className="w-4 h-4 hidden" />
                  <span>Integrations</span>
                </TabsTrigger> */}
                </TabsList>
              </div>
              {/* Profile Settings */}
              <TabsContent value="profile" className="mt-0">
                {" "}
                {/* Removed mt-6 */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {" "}
                      {/* Responsive grid */}
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileData.firstName}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      {" "}
                      {/* Added padding top */}
                      {/* <Button
                        onClick={handleProfileSave}
                        disabled={updateProfileMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </Button> */}
                      <RoundedPrimaryButton
                        title={
                          updateProfileMutation.isPending
                            ? "Saving..."
                            : "Save Changes"
                        }
                        onClick={handleProfileSave}
                        disabled={updateProfileMutation.isPending}
                        icon={SAVE_ICON_URI}
                        iconAlt="Save"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Removed old password field, assuming direct change */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newpassword}
                        onChange={(e) => {
                          setpassword(e.target.value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmpassword}
                        onChange={(e) => {
                          setconfirmpassword(e.target.value);
                        }}
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      {" "}
                      {/* Added padding top */}
                      <RoundedPrimaryButton
                        title={
                          updatePasswordMutation.isPending
                            ? "Updating..."
                            : "Update Password"
                        }
                        onClick={handleUpdatePassword}
                        disabled={updatePasswordMutation.isPending}
                        icon={REFRESH_ICON_URI}
                        iconAlt="Update"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="mt-0">
                {" "}
                {/* Removed mt-6 */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose how you want to be notified about updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">
                        Email Notifications
                      </h4>{" "}
                      {/* Improved heading style */}
                      <div className="space-y-3 pl-2 border-l-2 border-gray-100">
                        {" "}
                        {/* Indented section */}
                        <div className="flex items-center justify-between py-2">
                          {" "}
                          {/* Added padding */}
                          <div>
                            <Label htmlFor="emailNotificationsSwitch">
                              General email notifications
                            </Label>
                            <p className="text-sm text-gray-500">
                              Receive general system notifications
                            </p>
                          </div>
                          <Switch
                            id="emailNotificationsSwitch"
                            checked={notificationSettings.emailNotifications}
                            onCheckedChange={(checked) =>
                              setNotificationSettings((prev) => ({
                                ...prev,
                                emailNotifications: checked,
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          {" "}
                          {/* Added separator */}
                          <div>
                            <Label htmlFor="taskRemindersSwitch">
                              Task reminders
                            </Label>
                            <p className="text-sm text-gray-500">
                              Get notified about upcoming tasks
                            </p>
                          </div>
                          <Switch
                            id="taskRemindersSwitch"
                            checked={notificationSettings.taskReminders}
                            onCheckedChange={(checked) =>
                              setNotificationSettings((prev) => ({
                                ...prev,
                                taskReminders: checked,
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <div>
                            <Label htmlFor="leadNotificationsSwitch">
                              Lead notifications
                            </Label>
                            <p className="text-sm text-gray-500">
                              Alerts for new leads and assignments
                            </p>
                          </div>
                          <Switch
                            id="leadNotificationsSwitch"
                            checked={notificationSettings.leadNotifications}
                            onCheckedChange={(checked) =>
                              setNotificationSettings((prev) => ({
                                ...prev,
                                leadNotifications: checked,
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <div>
                            <Label htmlFor="meetingRemindersSwitch">
                              Meeting reminders
                            </Label>
                            <p className="text-sm text-gray-500">
                              Reminders for scheduled meetings
                            </p>
                          </div>
                          <Switch
                            id="meetingRemindersSwitch"
                            checked={notificationSettings.meetingReminders}
                            onCheckedChange={(checked) =>
                              setNotificationSettings((prev) => ({
                                ...prev,
                                meetingReminders: checked,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      {" "}
                      {/* Separator */}
                      <h4 className="font-medium text-gray-800">
                        Marketing & Reports
                      </h4>
                      <div className="space-y-3 pl-2 border-l-2 border-gray-100">
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label htmlFor="weeklyReportsSwitch">
                              Weekly reports
                            </Label>
                            <p className="text-sm text-gray-500">
                              Receive weekly performance summaries
                            </p>
                          </div>
                          <Switch
                            id="weeklyReportsSwitch"
                            checked={notificationSettings.weeklyReports}
                            onCheckedChange={(checked) =>
                              setNotificationSettings((prev) => ({
                                ...prev,
                                weeklyReports: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <div>
                            <Label htmlFor="marketingEmailsSwitch">
                              Marketing emails
                            </Label>
                            <p className="text-sm text-gray-500">
                              Product updates and feature announcements
                            </p>
                          </div>
                          <Switch
                            id="marketingEmailsSwitch"
                            checked={notificationSettings.marketingEmails}
                            onCheckedChange={(checked) =>
                              setNotificationSettings((prev) => ({
                                ...prev,
                                marketingEmails: checked,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                      {" "}
                      {/* Separator and padding */}
                      {/* <Button onClick={handleNotificationSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button> */}
                      <RoundedPrimaryButton
                        title="Save Preferences"
                        onClick={handleNotificationSave}
                        icon={SAVE_ICON_URI}
                        iconAlt="Save"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and access controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">
                        Two-Factor Authentication
                      </h4>
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        {" "}
                        {/* Added background */}
                        <div>
                          <Label htmlFor="twoFactorSwitch">Enable 2FA</Label>
                          <p className="text-sm text-gray-500">
                            Add an extra layer of security to your account
                          </p>
                          <Badge
                            variant={
                              securitySettings.twoFactorEnabled
                                ? "default"
                                : "secondary"
                            }
                            className="mt-2"
                          >
                            {securitySettings.twoFactorEnabled
                              ? "Enabled"
                              : "Disabled"}
                          </Badge>
                        </div>
                        <Switch
                          id="twoFactorSwitch"
                          checked={securitySettings.twoFactorEnabled}
                          onCheckedChange={(checked) =>
                            setSecuritySettings((prev) => ({
                              ...prev,
                              twoFactorEnabled: checked,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-800">
                        Session Management
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {" "}
                        {/* Responsive */}
                        <div className="space-y-2">
                          <Label htmlFor="sessionTimeout">
                            Session Timeout
                          </Label>
                          <Select
                            value={securitySettings.sessionTimeout}
                            onValueChange={(value) =>
                              setSecuritySettings((prev) => ({
                                ...prev,
                                sessionTimeout: value,
                              }))
                            }
                          >
                            <SelectTrigger id="sessionTimeout">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 hour</SelectItem>
                              <SelectItem value="8">8 hours</SelectItem>
                              <SelectItem value="24">24 hours</SelectItem>
                              <SelectItem value="168">7 days</SelectItem>
                              <SelectItem value="0">Never</SelectItem>{" "}
                              {/* Added Never option */}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="passwordExpiry">
                            Password Expiry
                          </Label>
                          <Select
                            value={securitySettings.passwordExpiry}
                            onValueChange={(value) =>
                              setSecuritySettings((prev) => ({
                                ...prev,
                                passwordExpiry: value,
                              }))
                            }
                          >
                            <SelectTrigger id="passwordExpiry">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 days</SelectItem>
                              <SelectItem value="60">60 days</SelectItem>
                              <SelectItem value="90">90 days</SelectItem>
                              <SelectItem value="180">180 days</SelectItem>{" "}
                              {/* Added option */}
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-800">
                        Login Security
                      </h4>
                      <div className="flex items-center justify-between py-2">
                        {" "}
                        {/* Added padding */}
                        <div>
                          <Label htmlFor="loginNotificationsSwitch">
                            Login notifications
                          </Label>
                          <p className="text-sm text-gray-500">
                            Get notified of new login attempts
                          </p>
                        </div>
                        <Switch
                          id="loginNotificationsSwitch"
                          checked={securitySettings.loginNotifications}
                          onCheckedChange={(checked) =>
                            setSecuritySettings((prev) => ({
                              ...prev,
                              loginNotifications: checked,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                      {/* <Button onClick={handleSecuritySave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Security Settings
                      </Button> */}
                      <RoundedPrimaryButton
                        title="Save Security Settings"
                        onClick={handleSecuritySave}
                        icon={SAVE_ICON_URI}
                        iconAlt="Save"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Settings */}
              <TabsContent value="system" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>System Preferences</CardTitle>
                    <CardDescription>
                      Configure your system display and regional settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={systemSettings.timezone}
                          onValueChange={(value) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              timezone: value,
                            }))
                          }
                        >
                          <SelectTrigger id="timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Consider a more comprehensive list or library for timezones */}
                            <SelectItem value="America/New_York">
                              Eastern Time (ET)
                            </SelectItem>
                            <SelectItem value="America/Chicago">
                              Central Time (CT)
                            </SelectItem>
                            <SelectItem value="America/Denver">
                              Mountain Time (MT)
                            </SelectItem>
                            <SelectItem value="America/Los_Angeles">
                              Pacific Time (PT)
                            </SelectItem>
                            <SelectItem value="Europe/London">
                              London (GMT/BST)
                            </SelectItem>
                            <SelectItem value="Europe/Paris">
                              Paris (CET/CEST)
                            </SelectItem>
                            <SelectItem value="Asia/Tokyo">
                              Tokyo (JST)
                            </SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={systemSettings.language}
                          onValueChange={(value) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              language: value,
                            }))
                          }
                        >
                          <SelectTrigger id="language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            {/* Add more languages */}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      {" "}
                      {/* Responsive grid */}
                      <div className="space-y-2">
                        <Label htmlFor="dateFormat">Date Format</Label>
                        <Select
                          value={systemSettings.dateFormat}
                          onValueChange={(value) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              dateFormat: value,
                            }))
                          }
                        >
                          <SelectTrigger id="dateFormat">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MM/DD/YYYY">
                              MM/DD/YYYY
                            </SelectItem>
                            <SelectItem value="DD/MM/YYYY">
                              DD/MM/YYYY
                            </SelectItem>
                            <SelectItem value="YYYY-MM-DD">
                              YYYY-MM-DD
                            </SelectItem>
                            <SelectItem value="MMM D, YYYY">
                              MMM D, YYYY
                            </SelectItem>{" "}
                            {/* Added format */}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeFormat">Time Format</Label>
                        <Select
                          value={systemSettings.timeFormat}
                          onValueChange={(value) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              timeFormat: value,
                            }))
                          }
                        >
                          <SelectTrigger id="timeFormat">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12">
                              12-hour (e.g., 3:00 PM)
                            </SelectItem>
                            <SelectItem value="24">
                              24-hour (e.g., 15:00)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={systemSettings.currency}
                          onValueChange={(value) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              currency: value,
                            }))
                          }
                        >
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="JPY">JPY (¥)</SelectItem>
                            <SelectItem value="CAD">CAD ($)</SelectItem>{" "}
                            {/* Added option */}
                            <SelectItem value="AUD">AUD ($)</SelectItem>{" "}
                            {/* Added option */}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                      {/* <Button onClick={handleSystemSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save System Settings
                      </Button> */}
                      <RoundedPrimaryButton
                        title="Save System Settings"
                        onClick={handleSystemSave}
                        icon={SAVE_ICON_URI}
                        iconAlt="Save"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Integrations */}
              <TabsContent value="integrations" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Third-Party Integrations</CardTitle>
                    <CardDescription>
                      Connect external services to enhance your CRM experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {" "}
                    {/* Reduced outer spacing */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />{" "}
                        {/* Responsive icon */}
                        <div className="min-w-0">
                          {" "}
                          {/* Prevent text overflow */}
                          <h4 className="font-medium text-sm sm:text-base">
                            Email Services
                          </h4>{" "}
                          {/* Responsive text */}
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            Gmail, Outlook integration
                          </p>{" "}
                          {/* Responsive, truncate */}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        {" "}
                        {/* Prevent shrinking, add margin */}
                        <Badge
                          variant="default"
                          className="text-xs px-2 py-0.5"
                        >
                          Connected
                        </Badge>{" "}
                        {/* Smaller badge */}
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Database className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">
                            Data Export
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            Export to CSV, Excel, PDF
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <Badge
                          variant="default"
                          className="text-xs px-2 py-0.5"
                        >
                          Available
                        </Badge>
                        <Button variant="outline" size="sm">
                          Settings
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">
                            API Access
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            REST API for custom integrations
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5"
                        >
                          Contact Admin
                        </Badge>
                        <Button variant="outline" size="sm" disabled>
                          Manage
                        </Button>
                      </div>
                    </div>
                    {/* Add more integration examples if needed */}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
