import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Customers from "@/pages/customers";
import Opportunities from "@/pages/opportunities";
import Contacts from "@/pages/contacts";
import Emails from "@/pages/emails";
import Calendar from "@/pages/calendar";
import { MeetingsPage as ViewAllMeetings } from "@/pages/view-all-meetings";
import Tasks from "@/pages/tasks";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Chat from "@/pages/chat";
import { GoogleCallback } from "@/components/auth/GoogleCallback";
import LogsPage from "@/pages/logs";
import Teams from "./pages/teams";
// import TeamsPage from "./pages/teams";
import NewDashboard from "./pages/newdashboard";
import ActivityLogs from "./pages/activitylogs";
import UserActivityLogPage from "./pages/userpage";
import { SidebarProvider } from "./components/ui/sidebar";
import zoom from "./pages/zoom";
import CallPage from "./pages/callpage";
import HostCallPage from "./pages/hostcallpage";
import InternalUserCallPage from "./pages/usercallpage";
import GuestCallPage from "./pages/guestcallpage";
import GuestThanks from "./pages/guest-thanks";
import Analytics from "./pages/analytics";import * as Tooltip from "@radix-ui/react-tooltip";
import ResetPasswordPage from "./components/forms/reset-password";
import ChatPage from "./pages/chatpage";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={NewDashboard} />  
      <Route path="/reset-password" component={ResetPasswordPage} />
      <ProtectedRoute path="/oldDashboard" component={Dashboard} />
      <ProtectedRoute path="/leads" component={Leads} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/opportunities" component={Opportunities} />
      <ProtectedRoute path="/contacts" component={Contacts} />
      <ProtectedRoute path="/emails" component={Emails} />
      <ProtectedRoute path="/calendar" component={Calendar} />
      <ProtectedRoute path="/view-all-meetings" component={ViewAllMeetings} />
      <ProtectedRoute path="/tasks" component={Tasks} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/logs" component={LogsPage} />
      <ProtectedRoute path="/activitylogs" component={ActivityLogs} />
      <ProtectedRoute path="/zoom" component={zoom} />
      {/* Legacy internal route -> keep for compatibility but redirect to new */}
      <ProtectedRoute path="/call/:slug" component={CallPage} />
      {/* New role-based call routes */}
      <ProtectedRoute path="/call/host/:slug" component={HostCallPage} />
      <ProtectedRoute
        path="/call/users/:slug"
        component={InternalUserCallPage}
      />
      <Route path="/call/guest/:slug" component={GuestCallPage} />
      <Route path="/guest-thanks" component={GuestThanks} />

          <ProtectedRoute path="/userpage" component={UserActivityLogPage} />

      <ProtectedRoute path="/teams" component={Teams} />
      <ProtectedRoute path="/chatpage" component={ChatPage} />
      <ProtectedRoute path="/newDashboard" component={NewDashboard} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      {/* Legacy guest route; keep temporarily for backlinks */}
      <Route path="/join/:slug" component={GuestCallPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/google/callback" component={GoogleCallback} />
      <Route component={NotFound} />


      
      
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <Toaster />
            <Router />
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
