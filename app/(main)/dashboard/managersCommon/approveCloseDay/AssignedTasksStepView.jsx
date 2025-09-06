import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle, Calendar, X, Info } from "lucide-react";
import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

// Component to handle individual extension request with proper hook usage
function ExtensionRequestItem({ 
  task, 
  getStatusColor, 
  handleAcceptExtension, 
  handleMoveToUndone, 
  handleViewTaskDetails,
  acceptedExtensions,
  undoneTasks,
  customDates,
  setCustomDates
}) {
  const { data: taskData, mutate: mutateTask } = useSWR(`/api/member/assignedTasks?taskId=${task.id}&action=task`, fetcher);
  const originalDeadline = taskData?.task?.deadline ? new Date(taskData.task.deadline).toLocaleDateString() : "N/A";
  const colors = getStatusColor(task.statusUpdate);

  return (
    <motion.div
      key={task.id}
      className={`bg-teal-50/40 rounded-3xl shadow-md p-4 border ${colors.border} hover:shadow-xl transition-all duration-200`}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-semibold text-gray-800 truncate pr-4">
          {task.title || "Untitled"}
        </p>
        <span className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} font-medium capitalize`}>
          {(task.statusUpdate || "not_started").replace("_", " ")}
        </span>
      </div>
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
          <Calendar size={14} className="text-teal-600" /> Original: {originalDeadline}
        </p>
        <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
          <Calendar size={14} className="text-teal-600" /> Requested: {task.newDeadline ? new Date(task.newDeadline).toLocaleDateString() : "N/A"}
        </p>
      </div>
      <div className="flex gap-2 mb-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            await handleAcceptExtension(task.id, task.newDeadline);
            mutateTask();
          }}
          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
          disabled={acceptedExtensions[task.id]}
        >
          {acceptedExtensions[task.id] ? "Accepted" : "Accept"}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleMoveToUndone(task)}
          className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
          disabled={undoneTasks[task.id]}
        >
          {undoneTasks[task.id] ? "Moved to Undone" : "Move to Undone"}
        </motion.button>
      </div>
      <div className="flex gap-2">
        <input
          type="date"
          value={customDates[task.id] || ''}
          onChange={(e) => setCustomDates({ ...customDates, [task.id]: e.target.value })}
          className="border border-teal-200 p-1 rounded text-xs flex-1 bg-teal-50/50 focus:ring-2 focus:ring-teal-500"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            await handleAcceptExtension(task.id, customDates[task.id]);
            mutateTask();
          }}
          disabled={!customDates[task.id] || acceptedExtensions[task.id]}
          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
        >
          Set Custom
        </motion.button>
        <motion.button
          onClick={() => handleViewTaskDetails(task.id)}
          className="text-green-600 text-xs font-medium hover:underline"
        >
          View Details
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function AssignedTasksStepView({
  assignedTasks,
  handlePrevViewStep,
  handleNextViewStep,
}) {
  const { data: session } = useSession();
  const [expandedLogs, setExpandedLogs] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [newLogComment, setNewLogComment] = useState("");
  const [selectedLogSprint, setSelectedLogSprint] = useState("");
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newTaskStatuses, setNewTaskStatuses] = useState({});
  const [newSprintStatuses, setNewSprintStatuses] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [customDates, setCustomDates] = useState({});
  const [pushedLogs, setPushedLogs] = useState({});
  const [acceptedExtensions, setAcceptedExtensions] = useState({});
  const [undoneTasks, setUndoneTasks] = useState({});
  const [isPushingLog, setIsPushingLog] = useState({});
  const [selectedTaskDetailsId, setSelectedTaskDetailsId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: detailedTask } = useSWR(
    selectedTaskDetailsId ? `/api/managersCommon/assignedTasks?taskId=${selectedTaskDetailsId}&action=details` : null,
    fetcher
  );

  useEffect(() => {
    if (detailedTask) {
      setShowDetailsModal(true);
    }
  }, [detailedTask]);

  useEffect(() => {
    if (taskDetails) {
      const taskStatuses = {};
      const sprintStatuses = {};
      taskDetails.assignees.forEach((a) => {
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
  }, [taskDetails]);

  const getStatusColor = (status) => {
    switch (status) {
      case "not_started": return { bg: "bg-red-50", border: "border-red-100", text: "text-red-600" };
      case "in_progress": return { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600" };
      case "pending_verification": return { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-600" };
      case "verified": case "done": return { bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-600" };
      default: return { bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-600" };
    }
  };

  const deriveTaskStatus = (sprints) => {
    if (sprints.every(s => s.status === "verified" || s.status === "done")) return "done";
    if (sprints.some(s => s.status === "pending_verification")) return "pending_verification";
    if (sprints.some(s => s.status === "in_progress")) return "in_progress";
    return "not_started";
  };

  const handleViewDetails = async (taskId) => {
    setSelectedTaskId(taskId);
    try {
      const res = await fetch(`/api/member/assignedTasks?taskId=${taskId}&action=task`);
      const data = await res.json();
      const task = data.task;

      const updatedAssignees = await Promise.all(task.assignees.map(async (assignee) => ({
        ...assignee,
        sprints: await fetchSprints(taskId, assignee.id),
      })));

      const assigneesWithStatus = updatedAssignees.map(assignee => ({
        ...assignee,
        status: assignee.sprints && assignee.sprints.length > 0 ? deriveTaskStatus(assignee.sprints) : assignee.status
      }));

      setTaskDetails({ ...task, assignees: assigneesWithStatus });

      const logsRes = await fetch(`/api/member/assignedTasks?taskId=${taskId}&action=logs`);
      const logsData = await logsRes.json();
      setTaskLogs(logsData.logs || []);
    } catch (err) {
      console.error("Failed to fetch task details", err);
      setError("Failed to fetch task details");
    }
  };

  const handleViewTaskDetails = (taskId) => {
    setSelectedTaskDetailsId(taskId);
  };

  const handlePushLog = async (task) => {
    setIsPushingLog(prev => ({ ...prev, [task.id]: true }));
    try {
      const response = await fetch("/api/managersCommon/closeDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pushLog",
          taskId: task.id,
          details: "[DayClose] " + (task.comment || "Day shutdown log pushed"),
        }),
      });
      if (response.ok) {
        setPushedLogs(prev => ({ ...prev, [task.id]: true }));
      } else {
        setError("Failed to push log");
      }
    } catch (err) {
      setError("Error pushing log");
      console.error(err);
    } finally {
      setIsPushingLog(prev => ({ ...prev, [task.id]: false }));
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
        setTaskLogs(prev => [
          { ...log, userId: session?.user?.id, userName: session?.user?.name },
          ...prev
        ]);
        setNewLogComment("");
        setSelectedLogSprint("");
        if (notifyAssignees) {
          const message = `Log added to task "${taskDetails.title}" by ${session?.user?.name}: ${newLogComment} [task:${taskId}]${body.sprintId ? ` [sprint:${body.sprintId}]` : ''}`;
          await Promise.all(
            taskDetails.assignees.map(a => a.id).filter(id => id !== session?.user?.id).map(userId =>
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
    if (!newLogComment) {
      setError("Comment required");
      return;
    }
    setIsUpdating(true);
    try {
      const body = {
        taskId: taskDetails.id,
        status,
        action: "update_task",
        memberId,
        notifyAssignees: true,
        notifyWhatsapp: false,
        newLogComment,
      };
      const response = await fetch(`/api/member/assignedTasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setTaskDetails(prev => ({
          ...prev,
          assignees: prev.assignees.map(a => a.id === memberId ? { ...a, status } : a)
        }));
        setTaskLogs(prev => [
          { id: Date.now(), userId: session?.user?.id, userName: session?.user?.name, action: "status_update", details: newLogComment, createdAt: new Date() },
          ...prev
        ]);
        setNewTaskStatuses(prev => ({ ...prev, [memberId]: status }));
        setNewLogComment("");
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
    if (!newLogComment) {
      setError("Comment required");
      return;
    }
    setIsUpdating(true);
    try {
      const body = {
        taskId: taskDetails.id,
        status,
        sprintId,
        action: "update_sprint",
        memberId,
        notifyAssignees: true,
        notifyWhatsapp: false,
        newLogComment,
      };
      const response = await fetch(`/api/member/assignedTasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setTaskDetails(prev => ({
          ...prev,
          assignees: prev.assignees.map(a => {
            if (a.id !== memberId) return a;
            const newSprints = a.sprints.map(s => s.id === sprintId ? { ...s, status } : s);
            const newDerived = deriveTaskStatus(newSprints);
            return { ...a, sprints: newSprints, status: newDerived };
          })
        }));
        setTaskLogs(prev => [
          { id: Date.now(), userId: session?.user?.id, userName: session?.user?.name, action: "sprint_status_update", details: newLogComment, createdAt: new Date(), sprintId },
          ...prev
        ]);
        setNewSprintStatuses(prev => ({ ...prev, [`${memberId}-${sprintId}`]: status }));
        setNewLogComment("");
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

  const handleAcceptExtension = async (taskId, newDeadline) => {
    try {
      const response = await fetch("/api/managersCommon/closeDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateDeadline",
          taskId,
          newDeadline,
        }),
      });
      if (response.ok) {
        setAcceptedExtensions(prev => ({ ...prev, [taskId]: true }));
      } else {
        setError("Failed to accept extension");
      }
    } catch (err) {
      setError("Error accepting extension");
      console.error(err);
    }
  };

  const handleMoveToUndone = async (task) => {
    if (!window.confirm("Are you sure you want to move this to undone?")) return;
    try {
      const response = await fetch("/api/managersCommon/closeDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "moveToUndone",
          taskType: "assigned",
          taskId: task.id,
          userId: session?.user?.id,
          date: new Date().toISOString(),
          details: task,
        }),
      });
      if (response.ok) {
        setUndoneTasks(prev => ({ ...prev, [task.id]: true }));
      } else {
        setError("Failed to move to undone");
      }
    } catch (err) {
      setError("Error moving to undone");
      console.error(err);
    }
  };

  const extensionRequests = assignedTasks.filter(task => task.newDeadline && new Date(task.newDeadline) > new Date());

  const completedTasks = assignedTasks.filter(task => task.statusUpdate === "verified" || task.statusUpdate === "done");

  const pendingTasks = assignedTasks.filter(task => task.statusUpdate !== "verified" && task.statusUpdate !== "done");

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <CheckCircle size={18} className="text-teal-600" />
        Assigned Tasks
      </h3>
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Left Column: Day Shutdown Logs */}
        <div className="border border-teal-200 rounded-lg p-6 bg-white shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-gray-800">Day Shutdown Logs</h4>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[400px]">
            {pendingTasks.map((task) => {
              const colors = getStatusColor(task.statusUpdate);
              const pendingLog = task.comment ? { details: task.comment, createdAt: new Date().toISOString(), userName: "Pending Update" } : { details: "No pending log", createdAt: new Date().toISOString(), userName: "N/A" };

              return (
                <motion.div
                  key={task.id}
                  className={`bg-teal-50/40 rounded-3xl shadow-md p-4 border ${colors.border} hover:shadow-xl transition-all duration-200`}
                  whileHover={{ y: -4, scale: 1.01 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-semibold text-gray-800 truncate pr-4">
                      {task.title || "Untitled"}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} font-medium capitalize`}>
                      {(task.statusUpdate || "not_started").replace("_", " ")}
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Pending Log:</p>
                    <div className="p-2 bg-teal-50/40 rounded-lg text-xs text-gray-600">
                      {pendingLog.userName}: {pendingLog.details} ({new Date(pendingLog.createdAt).toLocaleString()})
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handlePushLog(task)}
                      className="text-green-600 text-xs font-medium hover:underline"
                      disabled={isPushingLog[task.id] || pushedLogs[task.id]}
                    >
                      {pushedLogs[task.id] ? "Pushed" : "Push Log"}
                    </motion.button>
                    <motion.button
                      onClick={() => handleViewTaskDetails(task.id)}
                      className="text-green-600 text-xs font-medium hover:underline"
                    >
                      View Details
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
            {completedTasks.length > 0 && (
              <motion.div
                className="bg-teal-50/40 rounded-3xl shadow-md p-4 border border-teal-100 hover:shadow-xl transition-all duration-300"
                whileHover={{ y: -4, scale: 1.01 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Completed Tasks ({completedTasks.length})
                  </p>
                  <span className="text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-600 font-medium">
                    Done
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {completedTasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      className="aspect-square bg-teal-50 rounded-2xl p-2 cursor-pointer hover:bg-teal-100 transition-all duration-200 flex flex-col justify-between shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleViewTaskDetails(task.id)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: idx * 0.02 } }}
                    >
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {task.title || "Untitled"}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column: Deadline Extension Requests */}
        <div className="border border-teal-200 rounded-lg p-6 bg-white shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-gray-800">Deadline Extension Requests</h4>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[400px]">
            {extensionRequests.length > 0 ? (
              extensionRequests.map((task) => (
                <ExtensionRequestItem
                  key={task.id}
                  task={task}
                  getStatusColor={getStatusColor}
                  handleAcceptExtension={handleAcceptExtension}
                  handleMoveToUndone={handleMoveToUndone}
                  handleViewTaskDetails={handleViewTaskDetails}
                  acceptedExtensions={acceptedExtensions}
                  undoneTasks={undoneTasks}
                  customDates={customDates}
                  setCustomDates={setCustomDates}
                />
              ))
            ) : (
              <p className="text-sm text-gray-600 text-center">No deadline extension requests.</p>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      <AnimatePresence>
        {selectedTaskId && taskDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-5xl overflow-y-auto max-h-[85vh] shadow-2xl border border-teal-200"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">{taskDetails.title}</h2>
                <motion.button
                  onClick={() => setSelectedTaskId(null)}
                  className="text-gray-600 hover:text-gray-800"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={24} />
                </motion.button>
              </div>
              <div className="flex flex-row gap-8 mb-6">
                <div className="flex-1 space-y-5">
                  <p className="text-base"><strong className="text-gray-600">Description:</strong> {taskDetails.description || "N/A"}</p>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800">Assignees</h3>
                    {taskDetails.assignees.map((assignee) => (
                      <div key={assignee.id} className="mt-4 bg-teal-50/40 p-5 rounded-lg shadow-sm border border-teal-100">
                        <p className="text-base"><strong className="text-gray-600">Name:</strong> {assignee.name}</p>
                        <p className="text-base"><strong className="text-gray-600">Status:</strong> {assignee.status?.replace("_", " ") || "Unknown"}</p>
                        <div className="mt-3">
                          <select
                            value={newTaskStatuses[assignee.id] || assignee.status}
                            onChange={(e) => setNewTaskStatuses({ ...newTaskStatuses, [assignee.id]: e.target.value })}
                            className="px-3 py-1 border border-teal-200 rounded-lg text-sm bg-teal-50/50 focus:ring-2 focus:ring-teal-500"
                            disabled={(assignee.sprints && assignee.sprints.length > 0)}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending_verification">Pending Verification</option>
                            <option value="done">Done</option>
                            <option value="verified">Verified</option>
                          </select>
                          {(!assignee.sprints || assignee.sprints.length === 0) && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleUpdateTaskStatus(assignee.id, newTaskStatuses[assignee.id])}
                              disabled={newTaskStatuses[assignee.id] === assignee.status || !newLogComment || isUpdating}
                              className="ml-2 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                            >
                              Update Task Status
                            </motion.button>
                          )}
                        </div>
                        {(assignee.sprints && assignee.sprints.length > 0) && (
                          <div className="mt-2">
                            <h4 className="text-base font-semibold text-gray-600">Sprints</h4>
                            {assignee.sprints.map(sprint => (
                              <div key={sprint.id} className="mt-2 bg-teal-50/40 p-3 rounded shadow-sm border border-teal-100">
                                <p className="text-sm"><strong>{sprint.title || "Untitled Sprint"}:</strong> {sprint.description || "N/A"}</p>
                                <p className="text-sm">Status: {sprint.status?.replace("_", " ") || "Unknown"}</p>
                                <div className="mt-1">
                                  <select
                                    value={newSprintStatuses[`${assignee.id}-${sprint.id}`] || sprint.status}
                                    onChange={(e) => setNewSprintStatuses({ ...newSprintStatuses, [`${assignee.id}-${sprint.id}`]: e.target.value })}
                                    className="px-3 py-1 border border-teal-200 rounded-lg text-sm bg-teal-50/50 focus:ring-2 focus:ring-teal-500"
                                  >
                                    <option value="not_started">Not Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                    <option value="verified">Verified</option>
                                  </select>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleUpdateSprintStatus(assignee.id, sprint.id, newSprintStatuses[`${assignee.id}-${sprint.id}`])}
                                    disabled={newSprintStatuses[`${assignee.id}-${sprint.id}`] === sprint.status || !newLogComment || isUpdating}
                                    className="ml-2 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                                  >
                                    Update Sprint Status
                                  </motion.button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-base"><strong className="text-gray-600">Deadline:</strong> {taskDetails.deadline ? new Date(taskDetails.deadline).toLocaleString() : "N/A"}</p>
                  <p className="text-base"><strong className="text-gray-600">Resources:</strong> {taskDetails.resources || "N/A"}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Logs</h3>
                  <div className="max-h-80 overflow-y-auto space-y-4 mb-6">
                    {taskLogs.length > 0 ? (
                      taskLogs.map((log) => {
                        const sprint = log.sprintId
                          ? taskDetails.assignees
                            .flatMap((a) => a.sprints || [])
                            .find((s) => s.id === log.sprintId)
                          : null;
                        const prefix = sprint ? `[${sprint.title || "Untitled Sprint"}] ` : "[Main] ";
                        return (
                          <div
                            key={log.id}
                            className="p-5 bg-teal-50/40 rounded-lg shadow-sm border border-teal-100 transition-all duration-200"
                          >
                            <p className="text-base text-gray-800">
                              {prefix}
                              {log.userName}: {log.details}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-base text-gray-600">No logs available.</p>
                    )}
                  </div>
                  <div className="mt-6">
                    <h4 className="text-base font-semibold text-gray-600 mb-3">Add New Log</h4>
                    {taskDetails.assignees.some(a => a.sprints && a.sprints.length > 0) && (
                      <select
                        value={selectedLogSprint}
                        onChange={(e) => setSelectedLogSprint(e.target.value)}
                        className="w-full px-4 py-2 border border-teal-200 rounded-lg bg-teal-50/50 focus:ring-2 focus:ring-teal-500 text-sm font-medium text-gray-600 mb-3"
                      >
                        <option value="">Main Task</option>
                        {taskDetails.assignees.flatMap(a =>
                          a.sprints.map((s) => (
                            <option key={s.id} value={s.id}>
                              {a.name} - {s.title || "Untitled Sprint"}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                    <textarea
                      value={newLogComment}
                      onChange={(e) => setNewLogComment(e.target.value)}
                      placeholder="Add a comment to the task discussion..."
                      className="w-full px-4 py-3 border border-teal-200 rounded-lg bg-teal-50/50 focus:ring-2 focus:ring-teal-500 text-sm font-medium text-gray-600 mb-4 transition-all duration-200"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddLog(taskDetails.id, true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-all duration-200 relative"
                      disabled={!newLogComment || isAddingLog}
                    >
                      {isAddingLog ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="inline-block w-4 h-4 border-2 border-t-teal-200 border-teal-600 rounded-full"
                        />
                      ) : "Add Log & Notify Assignees"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Details Modal */}
      <AnimatePresence>
        {showDetailsModal && detailedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-xl max-w-lg w-full border border-teal-200"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">Task Details</h3>
              <p><strong className="text-gray-600">Title:</strong> {detailedTask.title}</p>
              <p><strong className="text-gray-600">Description:</strong> {detailedTask.description}</p>
              <p><strong className="text-gray-600">Status:</strong> {detailedTask.status}</p>
              <p><strong className="text-gray-600">Deadline:</strong> {detailedTask.deadline ? format(new Date(detailedTask.deadline), "yyyy-MM-dd") : "None"}</p>
              {detailedTask.sprints && <div><h4 className="text-gray-600">Sprints:</h4><ul>{detailedTask.sprints.map(s => <li key={s.id}>{s.title} - {s.status}</li>)}</ul></div>}
              {detailedTask.logs && <div><h4 className="text-gray-600">Logs:</h4><ul>{detailedTask.logs.map(l => <li key={l.id}>{l.details} ({l.createdAt})</li>)}</ul></div>}
              <motion.button
                onClick={() => setShowDetailsModal(false)}
                className="mt-4 bg-gray-600 text-white py-2 px-4 rounded-xl hover:bg-gray-500"
                whileHover={{ scale: 1.05 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between mt-6 gap-4">
        <motion.button
          onClick={handlePrevViewStep}
          className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Previous
        </motion.button>
        <motion.button
          onClick={handleNextViewStep}
          className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Next
        </motion.button>
      </div>
    </div>
  );
}