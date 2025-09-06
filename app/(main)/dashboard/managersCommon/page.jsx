"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR, { mutate } from "swr";
import SharedDashboard from "@/components/SharedDashboard";
import Link from "next/link";
import AssignedTaskDetails from "@/components/assignedTaskCardDetailForAll";

const fetcher = (url) => fetch(url).then((res) => res.json());

const deriveTaskStatus = (sprints) => {
  if (!sprints || sprints.length === 0) return "not_started";
  const statuses = sprints.map((s) => s.status);
  const allVerified = statuses.every((s) => s === "verified");
  const allDone = statuses.every((s) => s === "done");
  const allCompleted = statuses.every((s) => ["done", "verified"].includes(s));
  const someInProgress = statuses.some((s) => s === "in_progress");
  if (allVerified) return "verified";
  if (allDone) return "done";
  if (allCompleted) return "pending_verification";
  if (someInProgress) return "in_progress";
  return "not_started";
};

export default function ManagersCommonDashboard({ disableUserSelect = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [inProgressTasks, setInProgressTasks] = useState(0);
  const [notStartedTasks, setNotStartedTasks] = useState(0);
  const [pendingVerificationTasks, setPendingVerificationTasks] = useState(0);
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupByUser, setGroupByUser] = useState(false);
  const [groupByUpdated, setGroupByUpdated] = useState(false);
  const [groupByDeadline, setGroupByDeadline] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [latestUpdated, setLatestUpdated] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [selectedSummaryCategory, setSelectedSummaryCategory] = useState(null);
  const [categoryTasks, setCategoryTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [unreadLogs, setUnreadLogs] = useState(new Set());
  const [newLogComment, setNewLogComment] = useState("");
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isReminding, setIsReminding] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedLogSprint, setSelectedLogSprint] = useState("");
  const [newTaskStatuses, setNewTaskStatuses] = useState({});
  const [newSprintStatuses, setNewSprintStatuses] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});

  const { data: usersData } = useSWR("/api/member/users", fetcher);
  const dashboardKey = `/api/managersCommon/dashboard?user=${userFilter}&status=${statusFilter}${selectedDate ? `&date=${selectedDate}` : ''}`;
  const { data: dashboardData } = useSWR(dashboardKey, fetcher);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated" && !["admin", "team_manager"].includes(session?.user?.role)) {
      router.push("/dashboard/member");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (disableUserSelect) {
      setSelectedUserId(null);
    }
  }, [disableUserSelect]);

  useEffect(() => {
    if (usersData?.users) {
      setUsers(usersData.users);
    }
  }, [usersData]);

  useEffect(() => {
    if (dashboardData) {
      const filteredTasks = dedupeById(dashboardData.assignedTasks || []);
      setTasks(filteredTasks);
      setTotalTasks(dashboardData.summaries?.totalTasks || 0);
      setCompletedTasks(dashboardData.summaries?.completedTasks || 0);
      setInProgressTasks(dashboardData.summaries?.inProgressTasks || 0);
      setNotStartedTasks(dashboardData.summaries?.notStartedTasks || 0);
      setPendingVerificationTasks(dashboardData.summaries?.pendingVerificationTasks || 0);
      setLatestUpdated(dashboardData.latestUpdated || []);
      setRecentLogs(dashboardData.recentLogs || []);
      const unread = new Set();
      (dashboardData.recentLogs || []).forEach(log => {
        if (!localStorage.getItem(`viewed_${log.id}`)) {
          unread.add(log.taskId);
        }
      });
      setUnreadLogs(unread);
    }
  }, [dashboardData]);

  useEffect(() => {
    const handleOpenTask = async (e) => {
      const { taskId, sprintId } = e.detail;
      const task = await fetchTask(taskId);
      if (task) {
        handleViewTaskDetails(task);
      } else {
        setError("Task not found");
      }
    };
    window.addEventListener("member-open-task", handleOpenTask);
    return () => window.removeEventListener("member-open-task", handleOpenTask);
  }, []);

  useEffect(() => {
    const focusTask = searchParams.get("focusTask");
    if (focusTask) {
      const openFocusedTask = async () => {
        const task = await fetchTask(Number(focusTask));
        if (task) {
          handleViewTaskDetails(task);
        } else {
          setError("Task not found");
        }
      };
      openFocusedTask();
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedTask) {
      const taskStatuses = {};
      const sprintStatuses = {};
      selectedTask.assignees.forEach((a) => {
        taskStatuses[a.id] = a.status;
        if (a.sprints) {
          a.sprints.forEach((s) => {
            sprintStatuses[`${a.id}-${s.id}`] = s.status;
          });
        }
      });
      setNewTaskStatuses(taskStatuses);
      setNewSprintStatuses(sprintStatuses);
    }
  }, [selectedTask]);

  const dedupeById = (arr) => {
    const map = new Map();
    arr.forEach((item) => {
      if (map.has(item.id)) {
        const existing = map.get(item.id);
        if (item.assignees?.length) {
          const seen = new Set(existing.assignees.map((a) => a.id));
          item.assignees.forEach((a) => {
            if (!seen.has(a.id)) {
              seen.add(a.id);
              existing.assignees.push(a);
            }
          });
        }
        map.set(item.id, existing);
      } else {
        map.set(item.id, {
          ...item,
          assignees: item.assignees
            ? Array.from(
                new Map(item.assignees.map((a) => [a.id, a])).values()
              )
            : [],
        });
      }
    });
    return [...map.values()];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "not_started": return "bg-red-100 text-red-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "pending_verification": return "bg-blue-100 text-blue-800";
      case "done": case "verified": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      return user.name + (userId === Number(session?.user?.id) ? " (you)" : "");
    } else if (userId === Number(session?.user?.id)) {
      return session?.user?.name + " (you)";
    } else {
      return "Unknown";
    }
  };

  const groupedTasks = () => {
    if (!groupByUser) return null;
    const groups = {};
    tasks.forEach(task => {
      task.assignees.forEach(assignee => {
        const groupId = assignee.id;
        if (!groups[groupId]) groups[groupId] = [];
        if (!groups[groupId].some(t => t.id === task.id)) {
          groups[groupId].push(task);
        }
      });
    });
    return groups;
  };

  const groupedLatestUpdated = () => {
    if (!groupByUpdated) return null;
    const groups = {};
    latestUpdated.forEach(task => {
      task.assignees.forEach(assignee => {
        const groupId = assignee.id;
        if (!groups[groupId]) groups[groupId] = [];
        if (!groups[groupId].some(t => t.id === task.id)) {
          groups[groupId].push(task);
        }
      });
    });
    return groups;
  };

  const groupedDeadlineApproaching = () => {
    if (!groupByDeadline) return null;
    const groups = {};
    approachingDeadlines.forEach(task => {
      task.assignees.forEach(assignee => {
        const groupId = assignee.id;
        if (!groups[groupId]) groups[groupId] = [];
        if (!groups[groupId].some(t => t.id === task.id)) {
          groups[groupId].push(task);
        }
      });
    });
    return groups;
  };

  const handleRemindUser = async (taskId, userIds, taskTitle) => {
    setIsReminding(prev => ({ ...prev, [taskId]: true }));
    try {
      const logsRes = await fetch(`/api/member/assignedTasks?taskId=${taskId}&action=logs`);
      if (!logsRes.ok) {
        throw new Error(`Failed to fetch logs: ${logsRes.statusText}`);
      }
      const logsData = await logsRes.json();
      const latestLog = logsData.logs?.[0]?.details || "No recent updates";
      await Promise.all(
        userIds.map(async (userId) => {
          const recipientName = getUserName(userId);
          const message = `Hi ${recipientName}, please update me (${latestLog}) for this task "${taskTitle}" [task:${taskId}] :) Thank you`;
          const res = await fetch("/api/others/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session?.user?.id,
              recipientId: userId,
              message,
            }),
          });
          if (!res.ok) {
            throw new Error(`Failed to send chat message to user ${userId}`);
          }
        })
      );
      console.log(`Reminder sent for task ${taskId}`);
    } catch (err) {
      setError("Error sending reminder");
      console.error(err);
    } finally {
      setIsReminding(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleAddLog = async (taskId, notifyAssignees = false) => {
    if (!newLogComment) {
      setError("Log comment cannot be empty");
      return;
    }
    setIsAddingLog(true);
    try {
      const body = {
        taskId,
        action: "log_added",
        details: newLogComment,
      };
      if (selectedLogSprint) {
        body.sprintId = parseInt(selectedLogSprint);
      }
      const response = await fetch(`/api/member/assignedTasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const { log } = await response.json();
        setRecentLogs(prev => [
          { ...log, userId: session?.user?.id, userName: session?.user?.name },
          ...prev.slice(0, 4)
        ]);
        setTaskLogs(prev => [
          { ...log, userId: session?.user?.id, userName: session?.user?.name },
          ...prev
        ]);
        setNewLogComment("");
        setShowAddLogModal(false);
        setSelectedLogSprint("");
        if (notifyAssignees) {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            let message = `Log added to task "${task.title}" by ${getUserName(session?.user?.id)}: ${newLogComment} [task:${task.id}]`;
            if (body.sprintId) {
              message += ` [sprint:${body.sprintId}]`;
            }
            await Promise.all(
              task.assignees.map(a => a.id).filter(id => id !== session?.user?.id).map(userId =>
                fetch("/api/others/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: session?.user?.id,
                    recipientId: userId,
                    message,
                  }),
                })
              )
            );
          }
        }
      } else {
        setError("Failed to add log");
      }
    } catch (err) {
      setError("Error adding log");
      console.error(err);
    } finally {
      setIsAddingLog(false);
    }
  };

  const handleUpdateTaskStatus = async (memberId, status) => {
    setIsUpdating(true);
    try {
      const body = {
        taskId: selectedTask.id,
        status,
        action: "update_task",
        memberId,
        notifyAssignees: true,
        notifyWhatsapp: false,
        newLogComment: newLogComment,
      };
      const response = await fetch(`/api/member/assignedTasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setSelectedTask(prev => ({
          ...prev,
          assignees: prev.assignees.map(a => a.id === memberId ? { ...a, status } : a)
        }));
        setTaskLogs(prev => [
          { id: Date.now(), userId: session?.user?.id, userName: session?.user?.name, action: "status_update", details: body.newLogComment, createdAt: new Date() },
          ...prev
        ]);
        setNewTaskStatuses(prev => ({ ...prev, [memberId]: status }));
        setNewLogComment("");
        mutate(dashboardKey);
      } else {
        setError("Failed to update task status");
      }
    } catch (err) {
      setError("Error updating task status");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSprintStatus = async (memberId, sprintId, status) => {
    setIsUpdating(true);
    try {
      const body = {
        taskId: selectedTask.id,
        status,
        sprintId,
        action: "update_sprint",
        memberId,
        notifyAssignees: true,
        notifyWhatsapp: false,
        newLogComment: newLogComment,
      };
      const response = await fetch(`/api/member/assignedTasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setSelectedTask(prev => ({
          ...prev,
          assignees: prev.assignees.map(a => {
            if (a.id !== memberId) return a;
            const newSprints = a.sprints.map(s => s.id === sprintId ? { ...s, status } : s);
            const newDerived = deriveTaskStatus(newSprints);
            return { ...a, sprints: newSprints, status: newDerived };
          })
        }));
        setTaskLogs(prev => [
          { id: Date.now(), userId: session?.user?.id, userName: session?.user?.name, action: "sprint_status_update", details: body.newLogComment, createdAt: new Date(), sprintId },
          ...prev
        ]);
        setNewSprintStatuses(prev => ({ ...prev, [`${memberId}-${sprintId}`]: status }));
        setNewLogComment("");
        mutate(dashboardKey);
      } else {
        setError("Failed to update sprint status");
      }
    } catch (err) {
      setError("Error updating sprint status");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchTask = async (taskId) => {
    try {
      const res = await fetch(`/api/member/assignedTasks?taskId=${taskId}&action=task`);
      if (!res.ok) {
        throw new Error(`Failed to fetch task: ${res.statusText}`);
      }
      const data = await res.json();
      return data.task || null;
    } catch (err) {
      setError("Failed to fetch task");
      console.error(err);
      return null;
    }
  };

  const fetchSprints = async (taskId, assigneeId) => {
    try {
      const res = await fetch(`/api/member/assignedTasks?taskId=${taskId}&memberId=${assigneeId}&action=sprints`);
      if (!res.ok) {
        throw new Error(`Failed to fetch sprints: ${res.statusText}`);
      }
      const data = await res.json();
      return data.sprints || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleViewTaskDetails = async (task) => {
    const updatedAssignees = await Promise.all(task.assignees.map(async (assignee) => ({
      ...assignee,
      sprints: await fetchSprints(task.id, assignee.id),
    })));
    setSelectedTask({ ...task, assignees: updatedAssignees });
    try {
      const logsRes = await fetch(`/api/member/assignedTasks?taskId=${task.id}&action=logs`);
      if (!logsRes.ok) {
        throw new Error(`Failed to fetch logs: ${logsRes.statusText}`);
      }
      const logsData = await logsRes.json();
      const logs = logsData.logs || [];
      setTaskLogs(logs);
      if (Array.isArray(logs)) {
        logs.forEach(log => localStorage.setItem(`viewed_${log.id}`, true));
      }
      setUnreadLogs(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    } catch (err) {
      setError("Failed to fetch task logs");
      console.error(err);
    }
    setShowDetailsModal(true);
  };

  const handleViewLog = async (log) => {
    let task = tasks.find(t => t.id === log.taskId);
    if (!task) {
      task = await fetchTask(log.taskId);
    }
    if (task) {
      handleViewTaskDetails(task);
    } else {
      setError("Task not found");
    }
  };

  const handleSummaryClick = (category) => {
    let filtered = [];
    switch (category) {
      case "total":
        filtered = tasks;
        break;
      case "completed":
        filtered = tasks.filter(t => t.status === "done" || t.status === "verified");
        break;
      case "in_progress":
        filtered = tasks.filter(t => t.status === "in_progress");
        break;
      case "pending_verification":
        filtered = tasks.filter(t => t.status === "pending_verification");
        break;
      case "not_started":
        filtered = tasks.filter(t => t.status === "not_started");
        break;
    }
    setCategoryTasks(filtered);
    setSelectedSummaryCategory(category);
    setShowSummaryModal(true);
  };

  const handleBack = () => {
    if (session?.user?.role === "admin") {
      router.push("/dashboard/admin");
    } else {
      router.push("/dashboard/team_manager");
    }
  };

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg font-semibold text-gray-600"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const approachingDeadlines = tasks
    .filter(t => t.deadline && new Date(t.deadline) > new Date() && new Date(t.deadline) < new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000) && t.status !== "done" && t.status !== "verified")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 10);

  const viewedUser = users.find(u => u.id === selectedUserId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-8 flex items-center justify-center overflow-y-auto"
    >
      <style jsx>{`
        @media (max-width: 640px) {
          .modal {
            width: 100%;
            max-width: 95vw;
            padding: 1rem;
          }
          .task-card {
            width: 100%;
            min-width: unset;
          }
          .carousel-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
      <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto">
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg shadow-md"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center w-full">
            {selectedUserId ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedUserId(null)}
                  className="mr-2 p-2 bg-gray-200 text-gray-800 rounded-lg text-sm shadow-md transition-all duration-200 min-w-[44px] min-h-[44px]"
                >
                  Back
                </motion.button>
                <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800 truncate">{viewedUser?.name}&apos;s Dashboard</h1>
              </>
            ) : (
              <>
                {session?.user?.role !== "admin" && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBack}
                    className="mr-2 p-2 bg-gray-200 text-gray-800 rounded-lg text-sm shadow-md transition-all duration-200 min-w-[44px] min-h-[44px]"
                  >
                    Back
                  </motion.button>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800 truncate">Task Tracking Dashboard</h1>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            {session?.user?.role === "admin" && !disableUserSelect && (
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full sm:w-auto px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white shadow-sm min-h-[44px]"
              >
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white shadow-sm min-h-[44px]"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full sm:w-auto px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow-md transition-all duration-200 min-h-[44px]"
            >
              Filters
            </motion.button>
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 sm:top-auto right-4 w-64 sm:w-72 bg-white rounded-lg shadow-2xl p-4 z-20 border border-indigo-200"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 mb-1">User</p>
                      <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-500 transition-all duration-200 min-h-[44px]"
                      >
                        <option value="all">All Users</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 mb-1">Status</p>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-500 transition-all duration-200 min-h-[44px]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="pending_verification">Pending Verification</option>
                        <option value="done">Done/Verified</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link href="/dashboard/managersCommon/approveCloseDay" className="flex-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Approve Day Close
                </motion.button>
              </Link>
              <Link href="/dashboard/managersCommon/approveLeave" className="flex-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Leave Requests
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
        {selectedUserId ? (
          <SharedDashboard role="team_manager" viewUserId={selectedUserId} />
        ) : (
          <>
            {/* Task Overview - Clickable Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {[
                { label: "Total Tasks", value: totalTasks, color: "from-blue-50 to-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
                { label: "Completed", value: completedTasks, color: "from-green-50 to-green-100", border: "border-green-200", text: "text-green-700" },
                { label: "In Progress", value: inProgressTasks, color: "from-yellow-50 to-yellow-100", border: "border-yellow-200", text: "text-yellow-700" },
                { label: "Pending Verification", value: pendingVerificationTasks, color: "from-blue-50 to-blue-100", border: "border-blue-200", text: "text-blue-700" },
                { label: "Not Started", value: notStartedTasks, color: "from-red-50 to-red-100", border: "border-red-200", text: "text-red-700" },
              ].map(({ label, value, color, border, text }, index) => (
                <motion.div
                  key={index}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSummaryClick(label.toLowerCase().replace(" ", "_"))}
                  className={`cursor-pointer text-center p-4 bg-gradient-to-r ${color} rounded-lg shadow-md border ${border} transition-all duration-200`}
                >
                  <p className={`text-sm sm:text-base font-medium ${text}`}>{label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${text.replace("-700", "-800")}`}>{value}</p>
                </motion.div>
              ))}
            </div>
            {/* Recent Activity Logs */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-3">Latest Activity Logs</h2>
              <div className="carousel-container flex sm:overflow-x-auto sm:whitespace-nowrap flex-col sm:flex-row gap-4 sm:pb-4">
                {recentLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    className="task-card w-full sm:w-80 bg-white rounded-lg shadow-md p-4 relative border border-indigo-100 transition-all duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    {!localStorage.getItem(`viewed_${log.id}`) && (
                      <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                    <div className="flex flex-col h-full">
                      <p className="text-sm sm:text-base text-indigo-700 font-medium mb-2 truncate">
                        {log.userName || getUserName(log.userId)} {log.action} task {log.taskId}:
                      </p>
                      <div className="mb-2">
                        <p className={`text-sm text-gray-700 ${expandedLogs[log.id] ? '' : 'line-clamp-2'}`}>
                          {log.details}
                        </p>
                        {log.details.length > 100 && (
                          <button
                            onClick={() => setExpandedLogs(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            {expandedLogs[log.id] ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-indigo-600 mb-2 truncate">Assignees: {tasks.find(t => t.id === log.taskId)?.assignees.map(a => a.name).join(", ") || "N/A"}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                      <div className="flex justify-end mt-auto">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleViewLog(log)}
                          className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                        >
                          Details
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Two Columns: Latest Updated and Deadline Approaching */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border border-indigo-200 rounded-lg p-4 sm:p-6 shadow-md bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg sm:text-xl font-bold text-indigo-800">Latest Updated Tasks</h2>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setGroupByUpdated(!groupByUpdated)}
                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm transition-all duration-200 shadow-sm min-h-[44px]"
                  >
                    {groupByUpdated ? "Ungroup by User" : "Group by User"}
                  </motion.button>
                </div>
                {groupByUpdated ? (
                  Object.entries(groupedLatestUpdated() || {}).map(([userId, userTasks]) => (
                    <div key={userId} className="mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-indigo-700 mb-2">{getUserName(parseInt(userId))}</h3>
                      <div className="space-y-3">
                        {userTasks.map((task, index) => (
                          <motion.div
                            key={`${task.id}-${index}`}
                            className="bg-indigo-50 rounded-lg shadow-sm p-4 border border-indigo-200 transition-all duration-200"
                            whileTap={{ scale: 0.95 }}
                          >
                            <p className="text-sm sm:text-base text-indigo-800 truncate">{task.title}</p>
                            <p className="text-sm text-indigo-600 truncate">Assignees: {task.assignees.map(a => a.name).join(", ")}</p>
                            <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                              {task.status?.replace("_", " ") || "Unknown"}
                            </span>
                            <div className="flex gap-2 mt-2">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleViewTaskDetails(task)}
                                className="px-3 py-2 bg-gray-100 rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                              >
                                Details
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleRemindUser(task.id, task.assignees.map(a => a.id), task.title)}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm transition-all duration-200 relative min-h-[44px]"
                              >
                                {isReminding[task.id] ? (
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="inline-block w-4 h-4 border-2 border-t-indigo-200 border-indigo-600 rounded-full"
                                  />
                                ) : "Remind"}
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {latestUpdated.map((task) => (
                      <motion.div
                        key={task.id}
                        className="bg-indigo-50 rounded-lg shadow-sm p-4 border border-indigo-200 transition-all duration-200"
                        whileTap={{ scale: 0.95 }}
                      >
                        <p className="text-sm sm:text-base text-indigo-800 truncate">{task.title}</p>
                        <p className="text-sm text-indigo-600 truncate">Assignees: {task.assignees.map(a => a.name).join(", ")}</p>
                        <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                          {task.status?.replace("_", " ") || "Unknown"}
                        </span>
                        <div className="flex gap-2 mt-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewTaskDetails(task)}
                            className="px-3 py-2 bg-gray-100 rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                          >
                            Details
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRemindUser(task.id, task.assignees.map(a => a.id), task.title)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm transition-all duration-200 relative min-h-[44px]"
                          >
                            {isReminding[task.id] ? (
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="inline-block w-4 h-4 border-2 border-t-indigo-200 border-indigo-600 rounded-full"
                              />
                            ) : "Remind"}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border border-indigo-200 rounded-lg p-4 sm:p-6 shadow-md bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg sm:text-xl font-bold text-indigo-800">Deadline Approaching Tasks</h2>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setGroupByDeadline(!groupByDeadline)}
                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm transition-all duration-200 shadow-sm min-h-[44px]"
                  >
                    {groupByDeadline ? "Ungroup by User" : "Group by User"}
                  </motion.button>
                </div>
                {groupByDeadline ? (
                  Object.entries(groupedDeadlineApproaching() || {}).map(([userId, userTasks]) => (
                    <div key={userId} className="mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-indigo-700 mb-2">{getUserName(parseInt(userId))}</h3>
                      <div className="space-y-3">
                        {userTasks.map((task, index) => (
                          <motion.div
                            key={`${task.id}-${index}`}
                            className="bg-indigo-50 rounded-lg shadow-sm p-4 border border-indigo-200 transition-all duration-200"
                            whileTap={{ scale: 0.95 }}
                          >
                            <p className="text-sm sm:text-base text-indigo-800 truncate">{task.title}</p>
                            <p className="text-sm text-indigo-600 truncate">Assignees: {task.assignees.map(a => a.name).join(", ")}</p>
                            <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                              {task.status?.replace("_", " ") || "Unknown"}
                            </span>
                            <div className="flex gap-2 mt-2">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleViewTaskDetails(task)}
                                className="px-3 py-2 bg-gray-100 rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                              >
                                Details
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleRemindUser(task.id, task.assignees.map(a => a.id), task.title)}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm transition-all duration-200 relative min-h-[44px]"
                              >
                                {isReminding[task.id] ? (
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="inline-block w-4 h-4 border-2 border-t-indigo-200 border-indigo-600 rounded-full"
                                  />
                                ) : "Remind"}
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {approachingDeadlines.map((task) => (
                      <motion.div
                        key={task.id}
                        className="bg-indigo-50 rounded-lg shadow-sm p-4 border border-indigo-200 transition-all duration-200"
                        whileTap={{ scale: 0.95 }}
                      >
                        <p className="text-sm sm:text-base text-indigo-800 truncate">{task.title}</p>
                        <p className="text-sm text-indigo-600 truncate">Assignees: {task.assignees.map(a => a.name).join(", ")}</p>
                        <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                          {task.status?.replace("_", " ") || "Unknown"}
                        </span>
                        <div className="flex gap-2 mt-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewTaskDetails(task)}
                            className="px-3 py-2 bg-gray-100 rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                          >
                            Details
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRemindUser(task.id, task.assignees.map(a => a.id), task.title)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm transition-all duration-200 relative min-h-[44px]"
                          >
                            {isReminding[task.id] ? (
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="inline-block w-4 h-4 border-2 border-t-indigo-200 border-indigo-600 rounded-full"
                              />
                            ) : "Remind"}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Grouped by User */}
            {groupByUser && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-3">Tasks Grouped by User</h2>
                {Object.entries(groupedTasks() || {}).map(([userId, userTasks]) => (
                  <div key={userId} className="mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-indigo-700 mb-2">{getUserName(parseInt(userId))}</h3>
                    <div className="space-y-3">
                      {userTasks.map((task, index) => (
                        <motion.div
                          key={`${task.id}-${index}`}
                          className="bg-indigo-50 rounded-lg shadow-sm p-4 border border-indigo-200 transition-all duration-200"
                          whileTap={{ scale: 0.95 }}
                        >
                          <p className="text-sm sm:text-base text-indigo-800 truncate">{task.title}</p>
                          <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status?.replace("_", " ") || "Unknown"}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Task Details Modal */}
            <AnimatePresence>
              {showDetailsModal && selectedTask && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="modal bg-white rounded-2xl p-6 w-full max-w-lg sm:max-w-5xl overflow-y-auto max-h-[90vh] shadow-2xl border border-indigo-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-4">{selectedTask.title}</h2>
                    <AssignedTaskDetails
                      task={selectedTask}
                      taskLogs={taskLogs}
                      users={users}
                      onClose={() => setShowDetailsModal(false)}
                      isManager={true}
                      newLogComment={newLogComment}
                      setNewLogComment={setNewLogComment}
                      isAddingLog={isAddingLog}
                      onAddLog={() => handleAddLog(selectedTask.id, true)}
                      newTaskStatuses={newTaskStatuses}
                      setNewTaskStatuses={setNewTaskStatuses}
                      newSprintStatuses={newSprintStatuses}
                      setNewSprintStatuses={setNewSprintStatuses}
                      handleUpdateTaskStatus={handleUpdateTaskStatus}
                      handleUpdateSprintStatus={handleUpdateSprintStatus}
                      isUpdating={isUpdating}
                      currentUserId={session?.user?.id}
                      currentUserName={session?.user?.name}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Add Log Modal */}
            <AnimatePresence>
              {showAddLogModal && selectedTask && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="modal bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-indigo-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-4">Add Log for {selectedTask.title}</h2>
                    <textarea
                      value={newLogComment}
                      onChange={(e) => setNewLogComment(e.target.value)}
                      placeholder="Add a comment to the task discussion..."
                      className="w-full px-3 py-2 border border-indigo-300 rounded-lg bg-indigo-50 focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-700 mb-3 transition-all duration-200 min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddLogModal(false)}
                        className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddLog(selectedTask.id, true)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm transition-all duration-200 relative min-h-[44px]"
                        disabled={!newLogComment || isAddingLog}
                      >
                        {isAddingLog ? (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-4 h-4 border-2 border-t-indigo-200 border-indigo-600 rounded-full"
                          />
                        ) : "Add Log & Notify"}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Summary Modal */}
            <AnimatePresence>
              {showSummaryModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="modal bg-white rounded-2xl p-6 w-full max-w-lg sm:max-w-5xl overflow-y-auto max-h-[90vh] shadow-2xl border border-indigo-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-4">Tasks in {selectedSummaryCategory.toUpperCase()}</h2>
                    <div className="space-y-4">
                      {categoryTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          className="bg-indigo-50 rounded-lg shadow-md p-4 border border-indigo-200 transition-all duration-200"
                          whileTap={{ scale: 0.95 }}
                        >
                          <p className="text-sm sm:text-base text-indigo-800 truncate">{task.title}</p>
                          <p className="text-sm text-indigo-600 truncate">Assignees: {task.assignees.map(a => a.name).join(", ")}</p>
                          <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status?.replace("_", " ") || "Unknown"}
                          </span>
                          <div className="flex gap-2 mt-3">
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setShowSummaryModal(false);
                                handleViewTaskDetails(task);
                              }}
                              className="px-3 py-2 bg-gray-100 rounded-lg text-sm transition-all duration-200 min-h-[44px]"
                            >
                              Details
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRemindUser(task.id, task.assignees.map(a => a.id), task.title)}
                              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm transition-all duration-200 relative min-h-[44px]"
                            >
                              {isReminding[task.id] ? (
                                <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="inline-block w-4 h-4 border-2 border-t-indigo-200 border-indigo-600 rounded-full"
                                />
                              ) : "Remind"}
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSummaryModal(false)}
                      className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm transition-all duration-200 shadow-md min-h-[44px]"
                    >
                      Close
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}