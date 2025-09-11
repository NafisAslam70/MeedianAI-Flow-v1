"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url, { headers: { "Content-Type": "application/json" } }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  });

export default function MyMRIs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role;

  if (status === "loading") return <div>Loading...</div>;
  if (!["member", "team_manager"].includes(role)) {
    return <div>Access Denied</div>;
  }

  const [isAssignedTasksModalOpen, setIsAssignedTasksModalOpen] = useState(false);
  const [isRoutineTasksModalOpen, setIsRoutineTasksModalOpen] = useState(false);
  const [isAMRIsModalOpen, setIsAMRIsModalOpen] = useState(false);
  const [isNMRIsModalOpen, setIsNMRIsModalOpen] = useState(false);
  const [isSlotDescriptionModalOpen, setIsSlotDescriptionModalOpen] = useState(false);
  const [isMSPModalOpen, setIsMSPModalOpen] = useState(false);
  const [isMHCPModalOpen, setIsMHCPModalOpen] = useState(false);
  const [isMNPModalOpen, setIsMNPModalOpen] = useState(false);
  const [isMAPModalOpen, setIsMAPModalOpen] = useState(false);
  const [isMGHPModalOpen, setIsMGHPModalOpen] = useState(false);
  const [isRMRIInfoOpen, setIsRMRIInfoOpen] = useState(false);
  const [rRoleModalOpen, setRRoleModalOpen] = useState(false);
  const [rTaskModalOpen, setRTaskModalOpen] = useState(false);
  const [selectedRoleBundle, setSelectedRoleBundle] = useState(null); // { roleKey, roleName, tasks: [] }
  const [selectedRTask, setSelectedRTask] = useState(null); // { roleName, task }
  const [scanPanel, setScanPanel] = useState({ session: null, sessionToken: "", userTokenInput: "", logs: [] , starting: false, ingesting: false});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState(null);
  const [todayAMRIs, setTodayAMRIs] = useState([]);
  const [todayNMRIs, setTodayNMRIs] = useState([]);
  const [weeklyAMRIs, setWeeklyAMRIs] = useState([]);
  const [weeklyNMRIs, setWeeklyNMRIs] = useState([]);
  const [routineTasks, setRoutineTasks] = useState([]);
  const [isLoadingNMRIs, setIsLoadingNMRIs] = useState(true);
  const { data: roleTasksData, error: roleTasksError } = useSWR(
    session?.user?.id ? "/api/member/mris/role-tasks" : null,
    fetcher
  );

  // Fetch today's A-MRIs and N-MRIs
  const { data: todayMRIsData, error: todayMRIsError } = useSWR(
    session?.user?.id ? "/api/member/myMRIs?section=today" : null,
    fetcher
  );

  // Fetch weekly A-MRIs and N-MRIs
  const { data: weeklyMRIsData, error: weeklyMRIsError } = useSWR(
    session?.user?.id ? "/api/member/myMRIs?section=weekly" : null,
    fetcher
  );

  // Fetch assigned tasks
  const { data: assignedTasksData, error: assignedTasksError } = useSWR(
    session?.user?.id ? "/api/member/assignedTasks?action=tasks&date=2025-07-28" : null,
    fetcher
  );

  // Fetch routine tasks
  const { data: routineTasksData, error: routineTasksError } = useSWR(
    session?.user?.id ? "/api/member/routine-tasks?action=routineTasks&date=2025-07-28" : null,
    fetcher
  );

  useEffect(() => {
    // Handle today's A-MRIs and N-MRIs
    if (todayMRIsData) {
      setTodayAMRIs(todayMRIsData.aMRIs || []);
      setTodayNMRIs(todayMRIsData.nMRIs || []);
      setIsLoadingNMRIs(false);
    }
    if (todayMRIsError) {
      setError("Failed to load today's MRIs. Using placeholders.");
      setTodayAMRIs([{ title: "Prepare daily report", description: "" }, { title: "Team sync meeting", description: "" }, { title: "Review project updates", description: "" }]);
      setTodayNMRIs([{ id: 1, name: "Update task tracker", time: "09:00:00 - 10:00:00" }]);
      setTimeout(() => setError(null), 3000);
      setIsLoadingNMRIs(false);
    }

    // Handle weekly A-MRIs and N-MRIs
    if (weeklyMRIsData) {
      setWeeklyAMRIs(weeklyMRIsData.aMRIs || []);
      setWeeklyNMRIs(weeklyMRIsData.nMRIs || []);
    }
    if (weeklyMRIsError) {
      setError("Failed to load weekly MRIs. Using placeholders.");
      setWeeklyAMRIs([
        { day: "Monday", tasks: ["Task A1", "Task A2", "Task A3"] },
        { day: "Tuesday", tasks: ["Task A4", "Task A5"] },
        { day: "Wednesday", tasks: ["Task A6", "Task A7"] },
        { day: "Thursday", tasks: ["Task A8", "Task A9"] },
        { day: "Friday", tasks: ["Task A10"] },
        { day: "Saturday", tasks: [] },
        { day: "Sunday", tasks: [] },
      ]);
      setWeeklyNMRIs([
        { id: 1, name: "Supervision", time: "09:00:00 - 10:00:00" },
        { id: 2, name: "Review", time: "10:00:00 - 11:00:00" },
        { id: 3, name: "Planning", time: "11:00:00 - 12:00:00" },
      ]);
      setTimeout(() => setError(null), 3000);
    }

    // Handle assigned tasks
    if (assignedTasksData) {
      setTodayAMRIs(assignedTasksData.tasks || []);
    }
    if (assignedTasksError) {
      setError("Failed to load assigned tasks. Using placeholders.");
      setTodayAMRIs([{ title: "Prepare daily report", description: "" }, { title: "Team sync meeting", description: "" }, { title: "Review project updates", description: "" }]);
      setTimeout(() => setError(null), 3000);
    }

    // Handle routine tasks
    if (routineTasksData) {
      setRoutineTasks(routineTasksData.statuses || []);
    }
    if (routineTasksError) {
      setError("Failed to load routine tasks. Using placeholders.");
      setRoutineTasks([{ id: 1, description: "Daily check-in", status: "not_started" }, { id: 2, description: "Team report", status: "not_started" }]);
      setTimeout(() => setError(null), 3000);
    }
    if (roleTasksError) {
      // not critical, just log
      console.warn("Failed to load role tasks:", roleTasksError);
    }
  }, [session, todayMRIsData, todayMRIsError, weeklyMRIsData, weeklyMRIsError, assignedTasksData, assignedTasksError, routineTasksData, routineTasksError, roleTasksError]);

  const today = format(new Date("2025-07-28T21:45:00+08:00"), "EEEE, MMMM d, yyyy");

  const getBlockForSlot = (id) => {
    if (id >= 1 && id <= 6) return "Block 1";
    if (id >= 7 && id <= 9) return "Block 2";
    if (id >= 10 && id <= 11) return "Block 3";
    if (id >= 12 && id <= 14) return "Block 4";
    if (id >= 15 && id <= 16) return "Block 5";
    if (id === 17) return "Block 6";
    return "Unknown Block";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "not_started":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const blocks = [
    { title: "Block 1 (Slots 1-6)", range: { start: 1, end: 6 } },
    { title: "Block 2 (Slots 7-9)", range: { start: 7, end: 9 } },
    { title: "Block 3 (Slots 10-11)", range: { start: 10, end: 11 } },
    { title: "Block 4 (Slots 12-14)", range: { start: 12, end: 14 } },
    { title: "Block 5 (Slots 15-16)", range: { start: 15, end: 16 } },
    { title: "Block 6 (Slot 17)", range: { start: 17, end: 17 } },
  ];

  const renderBlock = (block, blockIndex) => {
    const filtered = weeklyNMRIs.filter((slot) => slot.id >= block.range.start && slot.id <= block.range.end);
    let slotsContent;
    if (filtered.length === 0) {
      slotsContent = <p className="text-sm text-gray-600 text-center">No N-Rituals in this block</p>;
    } else {
      slotsContent = filtered.map((slot) => (
        <motion.div
          key={slot.id}
          className="grid grid-cols-12 gap-4 items-center p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-200 text-sm text-gray-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: (slot.id - block.range.start) * 0.1 }}
        >
          <div className="col-span-2">Slot {slot.id}</div>
          <div className="col-span-3">{slot.name}</div>
          <div className="col-span-3">{slot.description || slot.name}</div>
          <div className="col-span-2">{slot.time}</div>
          <div className="col-span-2">
            <motion.button
              onClick={() => {
                setSelectedSlot(slot);
                setIsSlotDescriptionModalOpen(true);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View
            </motion.button>
          </div>
        </motion.div>
      ));
    }

    return (
      <div key={blockIndex} className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{block.title}</h3>
        <div className="grid grid-cols-12 gap-4 mb-4 bg-teal-50/50 rounded-xl p-3 text-sm font-semibold text-gray-800">
          <div className="col-span-2">Slot ID</div>
          <div className="col-span-3">Slot Name</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2">Time Slot</div>
          <div className="col-span-2">Action</div>
        </div>
        {slotsContent}
      </div>
    );
  };

  const nmrisContent = isLoadingNMRIs ? (
    <div className="flex flex-col items-center text-center py-8">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      <p className="text-sm text-gray-600 mt-2">Loading slots...</p>
    </div>
  ) : (
    <div className="space-y-8">{blocks.map(renderBlock)}</div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-gray-100 p-8 flex items-center justify-center"
    >
      <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-8 overflow-y-auto">
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 bg-red-50 text-red-600 p-4 rounded-xl shadow-md flex items-center gap-2"
              onClick={() => setError(null)}
            >
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error} (Click to dismiss)</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Today's MRIs Column */}
          <motion.div
            className="bg-white/50 backdrop-blur-sm rounded-3xl shadow-md p-6 border border-teal-100/50 flex flex-col lg:col-span-1"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800">Today's Rituals</h2>
              </div>
              <motion.button
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsRoutineTasksModalOpen(true)}
              >
                Routine tasks
              </motion.button>
            </div>
            <p className="text-sm text-gray-600 mb-6">{today}</p>

            {/* A-MRIs */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-teal-600" />
                A-Rituals
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {["MSP", "MHCP", "MNP"].map((program, index) => (
                  <motion.button
                    key={program}
                    className="bg-teal-50/80 rounded-xl p-3 flex items-center justify-center text-teal-800 font-semibold text-sm hover:bg-teal-100 transition-all duration-300"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      if (program === "MSP") setIsMSPModalOpen(true);
                      if (program === "MHCP") setIsMHCPModalOpen(true);
                      if (program === "MNP") setIsMNPModalOpen(true);
                    }}
                  >
                    {program}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* R-MRIs (Role-Based) */}
            {(roleTasksData?.roles || []).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={18} className="text-rose-600" />
                  R-MRIs (Role-Based Tasks)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(roleTasksData.roles || []).map((r, index) => (
                    <motion.button
                      key={r.roleKey}
                      className="bg-rose-50/80 rounded-xl p-3 flex items-center justify-center text-rose-800 font-semibold text-sm hover:bg-rose-100 transition-all duration-300 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => { setSelectedRoleBundle(r); setRRoleModalOpen(true); }}
                      title={r.roleKey}
                    >
                      {r.roleName || r.roleKey}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* N-MRIs */}
            <div className="mb-6 flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                N-Rituals
              </h3>
              {isLoadingNMRIs ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                </div>
              ) : todayNMRIs.length === 0 ? (
                <p className="text-sm text-gray-600 text-center">No N-Rituals today</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {todayNMRIs.map((slot, index) => (
                    <motion.button
                      key={slot.id}
                      className="bg-gray-50/80 rounded-xl p-3 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition-all duration-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setIsSlotDescriptionModalOpen(true);
                      }}
                    >
                      <p className="text-xs font-bold text-gray-800">Slot {slot.id}</p>
                      <p className="text-[0.6rem] text-gray-600">{slot.time}</p>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons removed to keep column compact and avoid extra scroll */}
          </motion.div>

          {/* My All Rituals Column */}
          <motion.div
            className="bg-white/50 backdrop-blur-sm rounded-3xl shadow-md p-6 border border-teal-100/50 flex flex-col lg:col-span-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={20} className="text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">All Rituals</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
              {/* A-Rituals Card */}
              <motion.div
                className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-teal-100/50 flex flex-col items-center justify-center text-center"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 16px rgba(0, 128, 128, 0.1)" }}
              >
                <Clock className="w-12 h-12 text-teal-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">A-Rituals</h3>
                <p className="text-sm text-gray-600 mb-4">View all A-Rituals for the week</p>
                <div className="grid grid-cols-3 gap-3 w-full">
                  {["MSP", "MHCP", "MNP", "MAP", "MGHP"].map((program, index) => (
                    <motion.button
                      key={program}
                      className="bg-teal-50/80 rounded-xl p-3 text-teal-800 font-semibold text-sm hover:bg-teal-100 transition-all duration-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        if (program === "MSP") setIsMSPModalOpen(true);
                        if (program === "MHCP") setIsMHCPModalOpen(true);
                        if (program === "MNP") setIsMNPModalOpen(true);
                        if (program === "MAP") setIsMAPModalOpen(true);
                        if (program === "MGHP") setIsMGHPModalOpen(true);
                      }}
                    >
                      {program}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* N-Rituals Card */}
              <motion.div
                className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-teal-100/50 flex flex-col items-center justify-center text-center cursor-pointer"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 16px rgba(0, 128, 128, 0.1)" }}
                onClick={() => setIsNMRIsModalOpen(true)}
              >
                <Clock className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">N-Rituals</h3>
                <p className="text-sm text-gray-600">View all N-Rituals for the week</p>
              </motion.div>

              {/* R-Rituals Card */}
              {(roleTasksData?.roles || []).length > 0 && (
                <motion.div
                  className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-rose-100/50 flex flex-col text-left"
                  whileHover={{ scale: 1.02, boxShadow: "0 8px 16px rgba(225, 29, 72, 0.08)" }}
                >
                  <CheckCircle className="w-12 h-12 text-rose-600 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">R-Rituals</h3>
                  <p className="text-sm text-gray-600 mb-4">Role-based tasks available to you</p>
                  <div className="grid grid-cols-2 gap-2">
                    {roleTasksData.roles
                      .flatMap((r) => (r.tasks || []).map((t) => ({ roleName: r.roleName || r.roleKey, task: t })))
                      .map((rt, idx) => (
                        <motion.button
                          key={`${rt.roleName}-${rt.task.id}`}
                          className="bg-rose-50 rounded-lg px-3 py-2 text-rose-800 text-xs font-medium hover:bg-rose-100 text-left truncate"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.03 }}
                          whileHover={{ scale: 1.03 }}
                          title={`${rt.roleName}: ${rt.task.title}`}
                          onClick={() => { setSelectedRTask(rt); setRTaskModalOpen(true); }}
                        >
                          {rt.task.title}
                        </motion.button>
                      ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {rRoleModalOpen && selectedRoleBundle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-rose-100/50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">{selectedRoleBundle.roleName || selectedRoleBundle.roleKey}</h2>
                  <motion.button
                    onClick={() => setRRoleModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {Array.isArray(selectedRoleBundle.tasks) && selectedRoleBundle.tasks.length > 0 ? (
                    selectedRoleBundle.tasks.map((t) => (
                      <div key={t.id} className="bg-rose-50/70 border border-rose-100 rounded-xl p-3">
                        <div className="font-semibold text-rose-900">{t.title}</div>
                        {t.description && <div className="text-xs text-gray-700 mt-1">{t.description}</div>}
                        {Array.isArray(t.submissables) && t.submissables.length > 0 && (
                          <ol className="list-decimal pl-5 text-xs text-gray-800 mt-2 space-y-1">
                            {t.submissables.map((s, i) => (<li key={i}>{String(s)}</li>))}
                          </ol>
                        )}
                        {t.action && <div className="text-[12px] text-gray-700 mt-2"><span className="font-semibold">Action:</span> {t.action}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">No tasks defined for this role.</div>
                  )}
                  {/* Scanner controls for MSP Elementary Moderator */}
                  {String(selectedRoleBundle.roleKey || "").toLowerCase() === "msp_ele_moderator" && (
                    <div className="mt-2 bg-white border border-rose-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-900">Day Opening — Scanner</div>
                        <button
                          className="px-2 py-1 text-xs rounded bg-rose-600 text-white disabled:opacity-60"
                          disabled={scanPanel.starting}
                          onClick={async ()=>{
                            try {
                              setScanPanel((p)=>({ ...p, starting: true }));
                              const r = await fetch('/api/attendance?section=sessionStart', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ roleKey: 'msp_ele_moderator', programKey: 'MSP', track: 'elementary' })});
                              const j = await r.json();
                              if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
                              setScanPanel((p)=>({ ...p, starting: false, session: j.session, sessionToken: j.token }));
                            } catch(e){
                              setScanPanel((p)=>({ ...p, starting: false }));
                              alert('Failed to start scanner: '+(e.message||e));
                            }
                          }}
                        >{scanPanel.session ? 'Restart' : 'Start'} Session</button>
                      </div>
                      {scanPanel.session && (
                        <div className="text-xs text-gray-700 space-y-2">
                          <div><span className="font-medium">Session:</span> #{scanPanel.session.id} — expires {new Date(scanPanel.session.expiresAt).toLocaleTimeString()}</div>
                          <div className="bg-rose-50 border border-rose-100 rounded p-2">
                            <div className="font-semibold text-rose-900">Session Code</div>
                            <div className="font-mono break-all text-[11px] text-rose-800">{scanPanel.sessionToken}</div>
                            <div className="text-[11px] text-gray-600 mt-1">Show this on your screen. Each member should open their personal code and you paste/scan below.</div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] text-gray-600">Member Code (paste from member’s phone)</label>
                              <input
                                value={scanPanel.userTokenInput}
                                onChange={(e)=> setScanPanel((p)=>({ ...p, userTokenInput: e.target.value }))}
                                placeholder="paste-token-here"
                                className="w-full border rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <button
                              className="px-3 py-2 rounded bg-rose-600 text-white text-xs disabled:opacity-60"
                              disabled={!scanPanel.userTokenInput || scanPanel.ingesting}
                              onClick={async ()=>{
                                try{
                                  setScanPanel((p)=>({ ...p, ingesting: true }));
                                  const r = await fetch('/api/attendance?section=ingest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionToken: scanPanel.sessionToken, userToken: scanPanel.userTokenInput })});
                                  const j = await r.json();
                                  if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
                                  setScanPanel((p)=>({ ...p, ingesting: false, userTokenInput: "", logs: [{ ts: Date.now(), ok:true }, ...p.logs].slice(0,20) }));
                                } catch(e){
                                  setScanPanel((p)=>({ ...p, ingesting: false, logs: [{ ts: Date.now(), ok:false, err: (e.message||String(e)) }, ...p.logs].slice(0,20) }));
                                }
                              }}
                            >Mark Present</button>
                          </div>
                          {scanPanel.logs.length>0 && (
                            <div className="mt-2">
                              <div className="text-[11px] font-semibold text-gray-700">Recent scans</div>
                              <ul className="text-[11px] text-gray-700 list-disc pl-5">
                                {scanPanel.logs.map((l,i)=>(
                                  <li key={i}>{new Date(l.ts).toLocaleTimeString()} — {l.ok? 'OK' : `Failed: ${l.err}`}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {rTaskModalOpen && selectedRTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-rose-100/50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">{selectedRTask.task.title}</h2>
                  <motion.button
                    onClick={() => setRTaskModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                <div className="text-sm text-gray-700 mb-2">Role: <span className="font-medium">{selectedRTask.roleName}</span></div>
                {selectedRTask.task.description && (
                  <div className="text-sm text-gray-800 mb-2">{selectedRTask.task.description}</div>
                )}
                {Array.isArray(selectedRTask.task.submissables) && selectedRTask.task.submissables.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-gray-800">Submissables</div>
                    <ol className="list-decimal pl-5 text-xs text-gray-700 mt-1 space-y-1">
                      {selectedRTask.task.submissables.map((s, i) => (<li key={i}>{String(s)}</li>))}
                    </ol>
                  </div>
                )}
                {selectedRTask.task.action && (
                  <div className="text-[12px] text-gray-700"><span className="font-semibold">Action:</span> {selectedRTask.task.action}</div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isAssignedTasksModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-teal-100/50"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Assigned Tasks</h2>
                  <motion.button
                    onClick={() => setIsAssignedTasksModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {todayAMRIs.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center">No assigned tasks for today.</p>
                  ) : (
                    todayAMRIs.map((task) => (
                      <div key={task.id} className="bg-gray-50/80 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-800">{task.title}</p>
                        <p className="text-sm text-gray-600">{task.description || "No description"}</p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                          Status: {task.status}
                        </span>
                        {task.sprints && task.sprints.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-800">Sprints:</p>
                            <ul className="list-disc pl-5 text-xs text-gray-600">
                              {task.sprints.map((sprint) => (
                                <li key={sprint.id}>{sprint.title} - {sprint.status}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <motion.button
                  onClick={() => setIsAssignedTasksModalOpen(false)}
                  className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300 mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isRoutineTasksModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-teal-100/50"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Routine Tasks</h2>
                  <motion.button
                    onClick={() => setIsRoutineTasksModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {routineTasks.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center">No routine tasks for today.</p>
                  ) : (
                    routineTasks.map((task) => (
                      <div key={task.id} className="bg-gray-50/80 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-800">{task.description}</p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                          Status: {task.status}
                        </span>
                        {task.comment && <p className="text-xs text-gray-600 mt-2">Comment: {task.comment}</p>}
                      </div>
                    ))
                  )}
                </div>
                <motion.button
                  onClick={() => setIsRoutineTasksModalOpen(false)}
                  className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300 mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAMRIsModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-teal-100/50"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Weekly A-Rituals</h2>
                  <motion.button
                    onClick={() => setIsAMRIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {weeklyAMRIs.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center">No A-Rituals this week.</p>
                  ) : (
                    weeklyAMRIs.map((day, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <h3 className="text-md font-semibold text-gray-800">{day.day}</h3>
                        <ul className="list-disc pl-5 text-sm text-gray-600">
                          {day.tasks.length === 0 ? (
                            <li>No A-Rituals for {day.day}</li>
                          ) : (
                            day.tasks.map((task, taskIndex) => (
                              <li key={taskIndex}>{task}</li>
                            ))
                          )}
                        </ul>
                      </motion.div>
                    ))
                  )}
                </div>
                <motion.button
                  onClick={() => setIsAMRIsModalOpen(false)}
                  className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300 mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isNMRIsModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto border border-teal-100/50"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Weekly N-Rituals (Assigned Slots)</h2>
                  <motion.button
                    onClick={() => setIsNMRIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
                {nmrisContent}
                <motion.button
                  onClick={() => setIsNMRIsModalOpen(false)}
                  className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300 mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSlotDescriptionModalOpen && selectedSlot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-teal-100/50"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Slot {selectedSlot.id} Details</h2>
                  <motion.button
                    onClick={() => setIsSlotDescriptionModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <p><span className="font-semibold">Slot ID:</span> {selectedSlot.id}</p>
                  <p><span className="font-semibold">Name:</span> {selectedSlot.name}</p>
                  <p><span className="font-semibold">Time:</span> {selectedSlot.time}</p>
                  <p><span className="font-semibold">Description:</span> {selectedSlot.description || selectedSlot.name}</p>
                  <p><span className="font-semibold">Block:</span> {getBlockForSlot(selectedSlot.id)}</p>
                </div>
                <motion.button
                  onClick={() => setIsSlotDescriptionModalOpen(false)}
                  className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300 mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Program Modals */}
        {["MSP", "MHCP", "MNP", "MAP", "MGHP"].map((program) => (
          <AnimatePresence key={program}>
            {(program === "MSP" && isMSPModalOpen) ||
            (program === "MHCP" && isMHCPModalOpen) ||
            (program === "MNP" && isMNPModalOpen) ||
            (program === "MAP" && isMAPModalOpen) ||
            (program === "MGHP" && isMGHPModalOpen) ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-md border border-teal-100/50"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{program} Details</h2>
                    <motion.button
                      onClick={() => {
                        if (program === "MSP") setIsMSPModalOpen(false);
                        if (program === "MHCP") setIsMHCPModalOpen(false);
                        if (program === "MNP") setIsMNPModalOpen(false);
                        if (program === "MAP") setIsMAPModalOpen(false);
                        if (program === "MGHP") setIsMGHPModalOpen(false);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X size={24} />
                    </motion.button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Details for the {program} program will be displayed here.
                  </p>
                  <div className="bg-gray-50/80 rounded-xl p-4 text-sm text-gray-700">
                    <p>Coming soon: Detailed program information, schedules, and resources.</p>
                  </div>
                  <motion.button
                    onClick={() => {
                      if (program === "MSP") setIsMSPModalOpen(false);
                      if (program === "MHCP") setIsMHCPModalOpen(false);
                      if (program === "MNP") setIsMNPModalOpen(false);
                      if (program === "MAP") setIsMAPModalOpen(false);
                      if (program === "MGHP") setIsMGHPModalOpen(false);
                    }}
                    className="w-full bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all duration-300 mt-6"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        ))}
      </div>
    </motion.div>
  );
}
