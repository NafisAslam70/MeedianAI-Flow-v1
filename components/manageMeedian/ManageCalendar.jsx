"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ManageCalendar({
  calendar,
  loading,
  isAdmin,
  onCalendarChange,
  onSaveCalendar,
  onAddEntry,
  error,
  success,
  setError,
  setSuccess,
}) {
  const [editingEntry, setEditingEntry] = useState(null);
  const [newWeek, setNewWeek] = useState({ startDate: "", endDate: "", name: "General", majorTerm: "", minorTerm: "", weekNumber: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAddEditConfirmOpen, setIsAddEditConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date("2025-07-28T07:13:00+08:00"));
  const [selectedYear, setSelectedYear] = useState(2025);
  const [viewMode, setViewMode] = useState("calendar");
  const [detailEntry, setDetailEntry] = useState(null);
  const [isConfirmingAddEdit, setIsConfirmingAddEdit] = useState(false);
  const currentDate = new Date("2025-07-28T07:13:00+08:00");

  useEffect(() => {
    console.log("Calendar data received:", calendar);
  }, [calendar]);

  const handleChange = (field, value) => {
    setNewWeek((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setNewWeek({
      startDate: entry.startDate ? new Date(entry.startDate).toISOString().split("T")[0] : "",
      endDate: entry.endDate ? new Date(entry.endDate).toISOString().split("T")[0] : "",
      name: entry.name || "General",
      majorTerm: entry.majorTerm || "",
      minorTerm: entry.minorTerm || "",
      weekNumber: entry.weekNumber !== undefined && entry.weekNumber !== null ? entry.weekNumber.toString() : "",
    });
    setIsModalOpen(true);
  };

  const handleAdd = (date = new Date()) => {
    const validDate = date instanceof Date && !isNaN(date) ? date : new Date();
    setEditingEntry(null);
    setNewWeek({
      startDate: validDate.toISOString().split("T")[0],
      endDate: new Date(validDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      name: "General",
      majorTerm: "",
      minorTerm: "",
      weekNumber: "",
    });
    setIsModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (newWeek.startDate && newWeek.endDate && newWeek.name && newWeek.majorTerm && newWeek.minorTerm) {
      setIsAddEditConfirmOpen(true);
      setConfirmAction(() => () => {
        if (editingEntry) {
          onCalendarChange(editingEntry.id, "startDate", newWeek.startDate);
          onCalendarChange(editingEntry.id, "endDate", newWeek.endDate);
          onCalendarChange(editingEntry.id, "name", newWeek.name);
          onCalendarChange(editingEntry.id, "majorTerm", newWeek.majorTerm);
          onCalendarChange(editingEntry.id, "minorTerm", newWeek.minorTerm);
          onCalendarChange(editingEntry.id, "weekNumber", newWeek.weekNumber ? parseInt(newWeek.weekNumber) : null);
        }
        setEditingEntry(null);
        setNewWeek({ startDate: "", endDate: "", name: "General", majorTerm: "", minorTerm: "", weekNumber: "" });
        setIsModalOpen(false);
        setIsConfirmingAddEdit(false);
      });
    } else {
      setError("Please fill in all required fields.");
    }
  };

  const handleAddWeek = () => {
    if (newWeek.startDate && newWeek.endDate && newWeek.name && newWeek.majorTerm && newWeek.minorTerm) {
      setIsAddEditConfirmOpen(true);
      setConfirmAction(() => () => {
        onAddEntry({
          id: Date.now(),
          majorTerm: newWeek.majorTerm,
          minorTerm: newWeek.minorTerm,
          startDate: newWeek.startDate,
          endDate: newWeek.endDate,
          name: newWeek.name,
          weekNumber: newWeek.weekNumber ? parseInt(newWeek.weekNumber) : null,
          isMajorTermBoundary: false,
        });
        setNewWeek({ startDate: "", endDate: "", name: "General", majorTerm: "", minorTerm: "", weekNumber: "" });
        setIsModalOpen(false);
        setIsConfirmingAddEdit(false);
      });
    } else {
      setError("Please fill in all required fields.");
    }
  };

  const handleConfirmSave = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirm = () => {
    setIsConfirmModalOpen(false);
    onSaveCalendar();
  };

  const handleConfirmAddEdit = () => {
    setIsAddEditConfirmOpen(false);
    if (confirmAction) {
      setIsConfirmingAddEdit(true);
      confirmAction();
    }
  };

  const getWeekNumber = (entry) => {
    if (entry.weekNumber !== undefined && entry.weekNumber !== null) {
      return entry.weekNumber;
    }
    const entries = calendar
      .filter((c) => !c.isMajorTermBoundary)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const index = entries.findIndex((e) => e.id === entry.id);
    return index >= 0 ? index + 1 : 0;
  };

  const getWeekColor = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date("2025-07-28T07:13:00+08:00");
    if (end < now) return "bg-red-500/20 text-red-100";
    if (start <= now && now <= end) return "bg-teal-500/20 text-teal-100 font-semibold";
    return "bg-white/10 text-white/80";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not Set";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getMinorTermPeriod = (majorTerm, minorTerm) => {
    const entries = calendar.filter((c) => c.majorTerm === majorTerm && c.minorTerm === minorTerm && !c.isMajorTermBoundary);
    if (entries.length === 0) return { start: "Not Set", end: "Not Set", count: 0 };
    const startDates = entries.map((e) => new Date(e.startDate)).filter((d) => !isNaN(d));
    const endDates = entries.map((e) => new Date(e.endDate)).filter((d) => !isNaN(d));
    const start = startDates.length > 0 ? new Date(Math.min(...startDates)) : null;
    const end = endDates.length > 0 ? new Date(Math.max(...endDates)) : null;
    return {
      start: start ? formatDate(start) : "Not Set",
      end: end ? formatDate(end) : "Not Set",
      count: entries.length,
    };
  };

  const generateMonthDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEntriesForDay = (day) => {
    if (!day) return [];
    return calendar.filter((entry) => {
      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);
      return day >= start && day <= end && !entry.isMajorTermBoundary;
    });
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1);
    setSelectedMonth(newMonth);
    setSelectedYear(newMonth.getFullYear());
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setSelectedYear(newYear);
    setSelectedMonth(new Date(newYear, selectedMonth.getMonth(), 1));
  };

  const years = Array.from({ length: 5 }, (_, i) => 2025 + i);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-white/90 text-lg font-medium animate-pulse">Loading Meed Public School Calendar...</p>
      </div>
    );
  }

  if (!calendar || calendar.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-white/90 text-lg font-medium mb-4">No calendar data available for 2025-26.</p>
          {isAdmin && (
            <motion.button
              onClick={() => handleAdd(new Date())}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Add First Week
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-6 max-w-full">
        <h1 className="text-xl font-bold text-white tracking-wide">Meed Public School Calendar 2025-26</h1>
        <motion.button
          onClick={() => setViewMode(viewMode === "calendar" ? "school" : "calendar")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {viewMode === "calendar" ? "School View" : "Calendar View"}
        </motion.button>
      </div>

      {viewMode === "school" ? (
        <div className="space-y-8 max-w-7xl mx-auto">
          <div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4">Term 1</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-sm p-6 border border-white/20">
                <h3 className="text-base font-medium text-white/90 mb-4">
                  Before FA1 ({getMinorTermPeriod("Term 1", "Before FA1").start} to {getMinorTermPeriod("Term 1", "Before FA1").end}, {getMinorTermPeriod("Term 1", "Before FA1").count} weeks)
                </h3>
                {calendar
                  .filter((c) => c.majorTerm === "Term 1" && c.minorTerm === "Before FA1" && !c.isMajorTermBoundary)
                  .map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className={`group relative rounded-lg p-4 mb-4 flex justify-between items-center ${getWeekColor(entry.startDate, entry.endDate)} border border-white/20 shadow-sm hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all duration-200`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setDetailEntry(entry)}
                    >
                      <div>
                        <p className="text-base font-medium">
                          Week {getWeekNumber(entry)}: {formatDate(entry.startDate)} - {formatDate(entry.endDate)} ({entry.name})
                        </p>
                        <p className="text-base text-white/80">{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                      {isAdmin && (
                        <motion.button
                          onClick={() => handleEdit(entry)}
                          className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-base font-medium shadow-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Edit
                        </motion.button>
                      )}
                      <div className="absolute hidden group-hover:block bg-gray-800/90 text-white text-base rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 shadow-[0_0_15px_rgba(0,255,255,0.5)] w-64">
                        <p className="font-medium">Week {getWeekNumber(entry)}: {entry.name}</p>
                        <p>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</p>
                        <p>{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                    </motion.div>
                  ))}
                {isAdmin && (
                  <motion.button
                    onClick={() => handleAdd(new Date())}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium mt-4 shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Add Week
                  </motion.button>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-sm p-6 border border-white/20">
                <h3 className="text-base font-medium text-white/90 mb-4">
                  After FA1 ({getMinorTermPeriod("Term 1", "After FA1").start} to {getMinorTermPeriod("Term 1", "After FA1").end}, {getMinorTermPeriod("Term 1", "After FA1").count} weeks)
                </h3>
                {calendar
                  .filter((c) => c.majorTerm === "Term 1" && c.minorTerm === "After FA1" && !c.isMajorTermBoundary)
                  .map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className={`group relative rounded-lg p-4 mb-4 flex justify-between items-center ${getWeekColor(entry.startDate, entry.endDate)} border border-white/20 shadow-sm hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all duration-200`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setDetailEntry(entry)}
                    >
                      <div>
                        <p className="text-base font-medium">
                          Week {getWeekNumber(entry)}: {formatDate(entry.startDate)} - {formatDate(entry.endDate)} ({entry.name})
                        </p>
                        <p className="text-base text-white/80">{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                      {isAdmin && (
                        <motion.button
                          onClick={() => handleEdit(entry)}
                          className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-base font-medium shadow-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Edit
                        </motion.button>
                      )}
                      <div className="absolute hidden group-hover:block bg-gray-800/90 text-white text-base rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 shadow-[0_0_15px_rgba(0,255,255,0.5)] w-64">
                        <p className="font-medium">Week {getWeekNumber(entry)}: {entry.name}</p>
                        <p>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</p>
                        <p>{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                    </motion.div>
                  ))}
                {isAdmin && (
                  <motion.button
                    onClick={() => handleAdd(new Date())}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium mt-4 shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Add Week
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4">Term 2</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-sm p-6 border border-white/20">
                <h3 className="text-base font-medium text-white/90 mb-4">
                  Before FA2 ({getMinorTermPeriod("Term 2", "Before FA2").start} to {getMinorTermPeriod("Term 2", "Before FA2").end}, {getMinorTermPeriod("Term 2", "Before FA2").count} weeks)
                </h3>
                {calendar
                  .filter((c) => c.majorTerm === "Term 2" && c.minorTerm === "Before FA2" && !c.isMajorTermBoundary)
                  .map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className={`group relative rounded-lg p-4 mb-4 flex justify-between items-center ${getWeekColor(entry.startDate, entry.endDate)} border border-white/20 shadow-sm hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all duration-200`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setDetailEntry(entry)}
                    >
                      <div>
                        <p className="text-base font-medium">
                          Week {getWeekNumber(entry)}: {formatDate(entry.startDate)} - {formatDate(entry.endDate)} ({entry.name})
                        </p>
                        <p className="text-base text-white/80">{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                      {isAdmin && (
                        <motion.button
                          onClick={() => handleEdit(entry)}
                          className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-base font-medium shadow-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Edit
                        </motion.button>
                      )}
                      <div className="absolute hidden group-hover:block bg-gray-800/90 text-white text-base rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 shadow-[0_0_15px_rgba(0,255,255,0.5)] w-64">
                        <p className="font-medium">Week {getWeekNumber(entry)}: {entry.name}</p>
                        <p>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</p>
                        <p>{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                    </motion.div>
                  ))}
                {isAdmin && (
                  <motion.button
                    onClick={() => handleAdd(new Date())}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium mt-4 shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Add Week
                  </motion.button>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-sm p-6 border border-white/20">
                <h3 className="text-base font-medium text-white/90 mb-4">
                  After FA2 ({getMinorTermPeriod("Term 2", "After FA2").start} to {getMinorTermPeriod("Term 2", "After FA2").end}, {getMinorTermPeriod("Term 2", "After FA2").count} weeks)
                </h3>
                {calendar
                  .filter((c) => c.majorTerm === "Term 2" && c.minorTerm === "After FA2" && !c.isMajorTermBoundary)
                  .map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className={`group relative rounded-lg p-4 mb-4 flex justify-between items-center ${getWeekColor(entry.startDate, entry.endDate)} border border-white/20 shadow-sm hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all duration-200`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setDetailEntry(entry)}
                    >
                      <div>
                        <p className="text-base font-medium">
                          Week {getWeekNumber(entry)}: {formatDate(entry.startDate)} - {formatDate(entry.endDate)} ({entry.name})
                        </p>
                        <p className="text-base text-white/80">{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                      {isAdmin && (
                        <motion.button
                          onClick={() => handleEdit(entry)}
                          className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-base font-medium shadow-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Edit
                        </motion.button>
                      )}
                      <div className="absolute hidden group-hover:block bg-gray-800/90 text-white text-base rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 shadow-[0_0_15px_rgba(0,255,255,0.5)] w-64">
                        <p className="font-medium">Week {getWeekNumber(entry)}: {entry.name}</p>
                        <p>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</p>
                        <p>{entry.majorTerm} - {entry.minorTerm}</p>
                      </div>
                    </motion.div>
                  ))}
                {isAdmin && (
                  <motion.button
                    onClick={() => handleAdd(new Date())}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium mt-4 shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Add Week
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4 items-center">
              <motion.button
                onClick={() => changeMonth(-1)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Previous
              </motion.button>
              <span className="text-base font-medium text-white">
                {selectedMonth.toLocaleString("default", { month: "long" })}
              </span>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-gray-800">{year}</option>
                ))}
              </select>
              <motion.button
                onClick={() => changeMonth(1)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Next
              </motion.button>
            </div>
            {isAdmin && (
              <motion.button
                onClick={handleConfirmSave}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Save Calendar
              </motion.button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-white/90 font-medium w-full">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2 text-base font-semibold">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 w-full">
            {generateMonthDays().map((day, index) => (
              <motion.div
                key={index}
                className={`group relative p-3 h-40 rounded-xl border border-white/20 bg-white/10 backdrop-blur-lg shadow-sm hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all duration-200 ${
                  day && day.toDateString() === currentDate.toDateString() ? "border-teal-500 border-2" : ""
                } ${day ? "cursor-pointer" : "bg-gray-800/50"}`}
                whileHover={day ? { scale: 1.02 } : {}}
                onClick={day ? () => getEntriesForDay(day).length > 0 && setDetailEntry(getEntriesForDay(day)[0]) : undefined}
              >
                {day && (
                  <>
                    <div className="text-base font-semibold text-white">{day.getDate()}</div>
                    <div className="mt-2 space-y-1">
                      {getEntriesForDay(day).map((entry) => (
                        <div
                          key={entry.id}
                          className={`text-base p-1 rounded-sm ${getWeekColor(entry.startDate, entry.endDate)} font-medium truncate max-w-full`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailEntry(entry);
                          }}
                        >
                          {entry.name} (Wk {getWeekNumber(entry)})
                        </div>
                      ))}
                    </div>
                    {getEntriesForDay(day).length > 0 && (
                      <div className="absolute hidden group-hover:block bg-gray-800/90 text-white text-base rounded-lg p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 shadow-[0_0_15px_rgba(0,255,255,0.5)] w-64">
                        {getEntriesForDay(day).map((entry) => (
                          <div key={entry.id} className="mb-1">
                            <p className="font-medium">Week {getWeekNumber(entry)}: {entry.name}</p>
                            <p>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</p>
                            <p>{entry.majorTerm} - {entry.minorTerm}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20"
          >
            <h2 className="text-lg font-semibold text-white mb-6 tracking-wide">{editingEntry ? "Edit Week" : "Add Week"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-white/90">Major Term <span className="text-red-400">*</span></label>
                <select
                  value={newWeek.majorTerm}
                  onChange={(e) => handleChange("majorTerm", e.target.value)}
                  className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
                >
                  <option value="" className="bg-gray-800">Select Major Term</option>
                  <option value="Term 1" className="bg-gray-800">Term 1</option>
                  <option value="Term 2" className="bg-gray-800">Term 2</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-white/90">Minor Term <span className="text-red-400">*</span></label>
                <select
                  value={newWeek.minorTerm}
                  onChange={(e) => handleChange("minorTerm", e.target.value)}
                  className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
                >
                  <option value="" className="bg-gray-800">Select Minor Term</option>
                  <option value="Before FA1" className="bg-gray-800">Before FA1</option>
                  <option value="After FA1" className="bg-gray-800">After FA1</option>
                  <option value="Before FA2" className="bg-gray-800">Before FA2</option>
                  <option value="After FA2" className="bg-gray-800">After FA2</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-white/90">Start Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={newWeek.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-white/90">End Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={newWeek.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-white/90">Week Type <span className="text-red-400">*</span></label>
                <select
                  value={newWeek.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
                >
                  <option value="General" className="bg-gray-800">General</option>
                  <option value="Exam" className="bg-gray-800">Exam</option>
                  <option value="Event" className="bg-gray-800">Event</option>
                  <option value="Holiday" className="bg-gray-800">Holiday</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-white/90">Week Number (optional)</label>
                <input
                  type="number"
                  value={newWeek.weekNumber}
                  onChange={(e) => handleChange("weekNumber", e.target.value)}
                  className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base text-white"
                  placeholder="Enter custom week number"
                  min="1"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <motion.button
                onClick={() => {
                  setEditingEntry(null);
                  setNewWeek({ startDate: "", endDate: "", name: "General", majorTerm: "", minorTerm: "", weekNumber: "" });
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-gray-500/80 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={editingEntry ? handleSaveEdit : handleAddWeek}
                disabled={isConfirmingAddEdit}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_15px_rgba(0,255,255,0.5)] flex items-center justify-center ${
                  isConfirmingAddEdit ? "cursor-not-allowed opacity-50" : ""
                }`}
                whileHover={{ scale: isConfirmingAddEdit ? 1 : 1.05 }}
                whileTap={{ scale: isConfirmingAddEdit ? 1 : 0.95 }}
              >
                {isConfirmingAddEdit ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z"></path>
                    </svg>
                    {editingEntry ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editingEntry ? "Save Changes" : "Add Week"
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {isAdmin && isConfirmModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20"
          >
            <h2 className="text-lg font-semibold text-white mb-4 tracking-wide">Confirm Save</h2>
            <p className="text-base text-white/80 mb-6">Are you sure you want to save changes to the calendar? This will update the database.</p>
            <div className="flex justify-end gap-3">
              <motion.button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 bg-gray-500/80 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleConfirm}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Confirm
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {isAdmin && isAddEditConfirmOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20"
          >
            <h2 className="text-lg font-semibold text-white mb-4 tracking-wide">Confirm {editingEntry ? "Edit" : "Add"} Week</h2>
            <p className="text-base text-white/80 mb-6">
              Are you sure you want to {editingEntry ? "edit this week" : "add this week"}? Changes will be queued and saved to the database upon clicking &quot;Save Calendar&quot;.
            </p>
            <div className="flex justify-end gap-3">
              <motion.button
                onClick={() => setIsAddEditConfirmOpen(false)}
                className="px-4 py-2 bg-gray-500/80 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleConfirmAddEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Confirm
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {detailEntry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20"
          >
            <h2 className="text-lg font-semibold text-white mb-4 tracking-wide">Week Details</h2>
            <div className="space-y-4">
              <p className="text-base font-medium text-white/90">Week {getWeekNumber(detailEntry)}: {detailEntry.name}</p>
              <p className="text-base text-white/80">Dates: {formatDate(detailEntry.startDate)} - {formatDate(detailEntry.endDate)}</p>
              <p className="text-base text-white/80">Term: {detailEntry.majorTerm} - {detailEntry.minorTerm}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <motion.button
                onClick={() => setDetailEntry(null)}
                className="px-4 py-2 bg-gray-500/80 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {(error || success) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.5)] ${
            error ? "bg-red-500/90 text-white" : "bg-green-500/90 text-white"
          } text-base font-medium`}
          onClick={() => {
            setError("");
            setSuccess("");
          }}
        >
          {error || success} (Click to dismiss)
        </motion.div>
      )}
    </div>
  );
}