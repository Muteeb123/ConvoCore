import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { Link } from "wouter";
import { Eye } from "lucide-react";
import { ViewtaskModel } from "@/components/modals/view-task-model";
import { useState } from "react";


export function TasksWidget() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    
  });


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-4 h-4 bg-gray-200 rounded mt-1"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (taskDate.getTime() === today.getTime() + 86400000) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming tasks
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTask(task);
                    setIsViewModalOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-500">
                    Due: {task.dueDate ? formatDueDate(task.dueDate) : "No due date"}
                  </p>
                  {task.assignedUserId && (
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-600">Assigned to: </span>
                      <span className="text-xs font-medium text-gray-900 ml-1">Team Member</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        <Link href="/tasks">
          <Button asChild variant="outline" className="w-full mt-4">
            <a>Go to Tasks</a>
          </Button>
        </Link>
        </CardContent>
      </Card>
      <ViewtaskModel
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        SelectedTask={selectedTask}
      />
    </div>
  );
}
