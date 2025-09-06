"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, Edit, Trash2, CheckCircle, AlertTriangle, FileText, X } from "lucide-react";

const MyNotes = ({
  userId,
  setError = () => {},
  setSuccess = () => {},
  embedded = false,
  fullScreen = false,
  onClose = () => {},
  initialMode = "view", // 'view' | 'add'
}) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [editingNoteCategory, setEditingNoteCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showViewNotesModal, setShowViewNotesModal] = useState(initialMode !== "add");
  const [showAddNoteModal, setShowAddNoteModal] = useState(initialMode === "add");
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");
  const [toolbarHidden, setToolbarHidden] = useState(false);

  // Load notes
  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/member/notes?userId=${userId}`);
        const data = await response.json();
        if (response.ok) setNotes(data.notes || []);
        else throw new Error(data.error || "Failed to fetch notes");
      } catch (err) {
        setError(err.message);
        setLocalError(err.message);
        setTimeout(() => {
          setError("");
          setLocalError("");
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchNotes();
  }, [userId, setError]);

  // Handle Escape key for fullScreen mode
  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setToolbarHidden(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullScreen]);

  // Helpers
  const closeAllInner = useCallback(() => {
    setShowViewNotesModal(false);
    setShowAddNoteModal(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeAllInner();
    if (showViewNotesModal || showAddNoteModal) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [showViewNotesModal, showAddNoteModal, closeAllInner]);

  const flash = useCallback((ok, msg) => {
    (ok ? setSuccess : setError)(msg);
    (ok ? setLocalSuccess : setLocalError)(msg);
    setTimeout(() => {
      setSuccess("");
      setError("");
      setLocalSuccess("");
      setLocalError("");
    }, ok ? 2500 : 3000);
  }, [setError, setSuccess]);

  // Actions
  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return flash(false, "Note content cannot be empty");
    if (!newCategory) return flash(false, "Please select a category");
    setIsLoading(true);
    try {
      const response = await fetch("/api/member/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content: newNote, category: newCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add note");
      setNotes((prev) => [...prev, data.note]);
      setNewNote("");
      setNewCategory("");
      flash(true, "Note added!");
      setShowAddNoteModal(false);
      setShowViewNotesModal(true);
    } catch (err) {
      flash(false, err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, newNote, newCategory, flash]);

  const handleEditNote = useCallback(async (noteId) => {
    if (!editingNoteContent.trim()) return flash(false, "Note content cannot be empty");
    if (!editingNoteCategory) return flash(false, "Please select a category");
    setIsLoading(true);
    try {
      const response = await fetch(`/api/member/notes?noteId=${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, content: editingNoteContent, category: editingNoteCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update note");
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, content: editingNoteContent, category: editingNoteCategory } : n
        )
      );
      setEditingNoteId(null);
      setEditingNoteContent("");
      setEditingNoteCategory("");
      flash(true, "Note updated!");
    } catch (err) {
      flash(false, err.message);
    } finally {
      setIsLoading(false);
    }
  }, [editingNoteContent, editingNoteCategory, flash]);

  const handleDeleteNote = useCallback(async (noteId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/member/notes?noteId=${noteId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete note");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      flash(true, "Note deleted!");
    } catch (err) {
      flash(false, err.message);
    } finally {
      setIsLoading(false);
    }
  }, [flash]);

  // UI
  const twoPane = showViewNotesModal && showAddNoteModal;
  const colsClass = twoPane ? "sm:grid-cols-2 grid-cols-1" : "grid-cols-1";

  if (embedded) return null;

  // Full‑screen writer overlay (uses same add-note state/actions)
  if (fullScreen) {
    const saveAsPDF = () => {
      const esc = (s = "") => s
        .replaceAll(/&/g, "&amp;")
        .replaceAll(/</g, "&lt;")
        .replaceAll(/>/g, "&gt;");
      const title = `My Notes — ${new Date().toLocaleString()}`;
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<!doctype html><html><head><meta charset=\"utf-8\" />
        <title>${title}</title>
        <style>
          @page { margin: 16mm; }
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111; }
          h1 { font-size: 16px; margin: 0 0 12px; }
          .note { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
        </style>
      </head><body>
        <h1>${esc(title)}</h1>
        <div class=\"note\">${esc(newNote || "")}</div>
      </body></html>`);
      w.document.close();
      w.focus();
      w.print();
    };

    return (
      <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
        <div className="relative w-full h-full bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
          <div className={`absolute top-3 left-3 right-3 flex items-center justify-between gap-2 transition ${toolbarHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm">
                Close
              </button>
              <button onClick={() => setToolbarHidden(true)} className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm" title="Hide UI">
                Hide UI
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={saveAsPDF} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
                Save as PDF
              </button>
              <button
                onClick={() => {
                  if (!newCategory) setNewCategory("Other");
                  handleAddNote();
                }}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60"
              >
                {isLoading ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
          {toolbarHidden && (
            <button
              onClick={() => setToolbarHidden(false)}
              className="absolute top-2 right-2 px-2 py-1 rounded bg-gray-200/90 text-gray-700 text-xs shadow"
              title="Show UI"
            >
              Show UI
            </button>
          )}
          <div className="absolute inset-0 pt-14">
            <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 text-sm sm:text-base text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                >
                  <option value="">Select Category</option>
                  {["MSP", "MHCP", "MHP", "MOP", "Other", "Building Home"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="h-[calc(100%-120px)]">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your note in full-screen mode…"
                  className="w-full h-full resize-none outline-none border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 text-base sm:text-lg text-gray-800 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 p-3"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className={`grid ${colsClass} h-full gap-4`}>
        {/* View Notes Pane */}
        {showViewNotesModal && (
          <div className="min-w-0 h-full flex flex-col rounded-lg bg-gradient-to-br from-blue-50/60 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-900/70 border border-teal-100/70 shadow">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/40 dark:border-slate-700/60">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                Your Notes
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowAddNoteModal(true);
                  setShowViewNotesModal(false);
                }}
                className="px-4 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Add Note
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
              {isLoading && (
                <motion.p
                  className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                >
                  Loading notes...
                </motion.p>
              )}
              {!isLoading && notes.length === 0 && (
                <motion.p
                  className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                >
                  No notes yet.
                </motion.p>
              )}
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  className="flex gap-3 p-3 rounded-lg bg-white/70 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 shadow"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {editingNoteId === note.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <select
                        value={editingNoteCategory}
                        onChange={(e) => setEditingNoteCategory(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 text-sm sm:text-base text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                      >
                        <option value="">Select Category</option>
                        {["MSP", "MHCP", "MHP", "MOP", "Other", "Building Home"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <textarea
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 text-sm sm:text-base text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditNote(note.id)}
                          className="px-4 py-1 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
                        >
                          Save
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingNoteContent("");
                            setEditingNoteCategory("");
                          }}
                          className="px-4 py-1 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-teal-700 dark:text-teal-300 font-bold">[{note.category}]</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-gray-800 dark:text-gray-100">{note.content}</p>
                      <div className="flex gap-2 mt-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingNoteContent(note.content);
                            setEditingNoteCategory(note.category);
                          }}
                          className="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteNote(note.id)}
                          className="px-4 py-1 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {localError && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 text-red-600 dark:text-red-300 text-sm font-medium flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> {localError}
                </motion.p>
              )}
              {localSuccess && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 text-emerald-600 dark:text-emerald-300 text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> {localSuccess}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Add Note Pane */}
        {showAddNoteModal && (
          <div className="min-w-0 h-full flex flex-col rounded-lg bg-gradient-to-br from-blue-50/60 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-900/70 border border-teal-100/70 shadow">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/40 dark:border-slate-700/60">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-teal-600" />
                Add New Note
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowViewNotesModal(true);
                  setShowAddNoteModal(false);
                }}
                className="px-4 py-1 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
              >
                View Notes
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 text-sm sm:text-base text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                >
                  <option value="">Select Category</option>
                  {["MSP", "MHCP", "MHP", "MOP", "Other", "Building Home"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Note Content
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a new note..."
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 text-sm sm:text-base text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                  rows={4}
                />
              </div>
            </div>
            <div className="p-3 sm:p-4 border-t border-white/40 dark:border-slate-700/60 flex justify-end gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddNoteModal(false)}
                className="px-4 py-1 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddNote}
                disabled={isLoading}
                className={`px-4 py-1 bg-teal-600 text-white rounded-lg text-sm font-medium ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
                }`}
              >
                {isLoading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block w-4 h-4 border-2 border-t-teal-200 border-teal-600 rounded-full"
                  />
                ) : (
                  "Add Note"
                )}
              </motion.button>
            </div>
            <AnimatePresence>
              {localError && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-3 pb-3 text-red-600 dark:text-red-300 text-sm font-medium flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> {localError}
                </motion.p>
              )}
              {localSuccess && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-3 pb-3 text-emerald-600 dark:text-emerald-300 text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> {localSuccess}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #b6e0fe66;
          border-radius: 3px;
        }
        .custom-scrollbar {
          scrollbar-color: #60a5fa44 transparent;
          scrollbar-width: thin;
        }
        html.dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2563eb77;
        }
      `}</style>
    </div>
  );
};

export default MyNotes;
