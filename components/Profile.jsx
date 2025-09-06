"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, X, User, Calendar, MessageSquare, BookOpen, FileText, BarChart, Send, UserCircle, Phone } from "lucide-react";
import Link from "next/link";
import AllMessageHistory from "./AllMessageHistory";

export default function Profile({ setChatboxOpen = () => {}, setChatRecipient = () => {} }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [formData, setFormData] = useState({
    name: "",
    whatsapp_number: "",
    whatsapp_enabled: true,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [leaveRequest, setLeaveRequest] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    transferTo: "",
    proof: null,
  });
  const [messageData, setMessageData] = useState({
    recipientType: "existing",
    recipientId: "",
    customName: "",
    customWhatsappNumber: "",
    subject: "",
    message: "",
    note: "",
    contact: "admin@mymeedai.org",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showConfirmMessageModal, setShowConfirmMessageModal] = useState(false);
  const [showSentMessageHistoryModal, setShowSentMessageHistoryModal] = useState(false);
  const [compiledMessage, setCompiledMessage] = useState("");
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [immediateSupervisor, setImmediateSupervisor] = useState(null);
  // Current MRN widget removed from Profile
  // removed selectedWidget (widgets moved to right sidebar quick actions)

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        whatsapp_number: session.user.whatsapp_number || "",
        whatsapp_enabled: session.user.whatsapp_enabled !== false,
      });
      setImagePreview(session.user.image || "/default-avatar.png");
    }
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/member/profile", { credentials: "include" });
        const data = await response.json();
        if (response.ok) {
          setFormData({
            name: data.user.name || "",
            whatsapp_number: data.user.whatsapp_number || "",
            whatsapp_enabled: data.user.whatsapp_enabled !== false,
          });
          setImagePreview(data.user.image || "/default-avatar.png");
          setImmediateSupervisor({
            id: data.user.immediate_supervisor,
            name: data.user.immediate_supervisor_name || "None",
            role: data.user.immediate_supervisor_role || "",
          });
          await fetch("/api/auth/session", { credentials: "include" });
        } else {
          console.error("Failed to fetch profile:", { status: response.status, error: data.error });
          setError(data.error || "Failed to fetch profile data");
          setTimeout(() => setError(""), 3000);
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        setError("Failed to fetch profile data");
        setTimeout(() => setError(""), 3000);
      }
    };
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch("/api/member/users", { credentials: "include" });
        const data = await response.json();
        if (response.ok) {
          const currentUser = data.users.find((u) => u.id === parseInt(session?.user?.id));
          console.log("Fetched users from /api/member/users:", {
            users: data.users,
            currentUserId: session?.user?.id,
            parsedUserId: parseInt(session?.user?.id),
            currentUser,
            currentUserMriRoles: currentUser?.mriRoles || [],
          });
          setUsers(data.users || []);
        } else {
          console.error("Failed to fetch users:", { status: response.status, error: data.error });
          setError("Failed to fetch users. Please try again.");
          setTimeout(() => setError(""), 3000);
        }
      } catch (err) {
        console.error("Fetch users error:", err);
        setError("Failed to fetch users. Please try again.");
        setTimeout(() => setError(""), 3000);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    const fetchLeaveHistory = async () => {
      try {
        const response = await fetch("/api/member/leave-request", { credentials: "include" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch leave history: ${response.statusText || "Unknown error"}`);
        }
        const data = await response.json();
        setLeaveHistory(data.requests || []);
      } catch (err) {
        console.error("Fetch leave history error:", err);
        setError(`Failed to fetch leave history: ${err.message}`);
        setTimeout(() => setError(""), 3000);
      }
    };
    const fetchSentMessages = async () => {
      try {
        const response = await fetch("/api/member/sent-messages?mode=custom", { credentials: "include" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch sent messages: ${response.statusText || "Unknown error"}`);
        }
        const data = await response.json();
        setSentMessages(data.messages || []);
      } catch (err) {
        console.error("Fetch sent messages error:", err);
        setError(`Failed to fetch sent messages: ${err.message}`);
        setTimeout(() => setError(""), 3000);
      }
    };
    if (status === "authenticated") {
      fetchProfile();
      fetchUsers();
      fetchLeaveHistory();
      if (showSentMessageHistoryModal) {
        fetchSentMessages();
      }
      // removed MRN polling in Profile view
    }
  }, [session, status, showSentMessageHistoryModal]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLeaveChange = (e) => {
    const { name, value, files } = e.target;
    setLeaveRequest((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleMessageChange = (e) => {
    const { name, value } = e.target;
    setMessageData((prev) => ({
      ...prev,
      [name]: name === "recipientId" ? parseInt(value) || "" : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        setTimeout(() => setError(""), 3000);
        return;
      }
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("whatsapp_number", formData.whatsapp_number);
      formDataToSend.append("whatsapp_enabled", formData.whatsapp_enabled);
      if (profileImage) {
        formDataToSend.append("image", profileImage);
      }
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        body: formDataToSend,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      setFormData({
        name: data.user.name || "",
        whatsapp_number: data.user.whatsapp_number || "",
        whatsapp_enabled: data.user.whatsapp_enabled !== false,
      });
      setImagePreview(data.user.image || "/default-avatar.png");
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 2500);
      await fetch("/api/auth/session", { credentials: "include" });
      window.postMessage({ type: "PROFILE_UPDATED" }, window.location.origin);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New password and confirmation do not match");
      setTimeout(() => setError(""), 3000);
      setIsLoading(false);
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      setTimeout(() => setError(""), 3000);
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/member/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }
      setSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageDelete = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/member/profile", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete profile picture");
      }
      setProfileImage(null);
      setImagePreview(data.user.image || "/default-avatar.png");
      setSuccess("Profile picture removed!");
      setTimeout(() => setSuccess(""), 2500);
      await fetch("/api/auth/session", { credentials: "include" });
      window.postMessage({ type: "PROFILE_UPDATED" }, window.location.origin);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    if (!leaveRequest.startDate || !leaveRequest.endDate || !leaveRequest.reason) {
      setError("Please fill in all required fields");
      setTimeout(() => setError(""), 3000);
      setIsLoading(false);
      return;
    }
    try {
      const leaveData = new FormData();
      leaveData.append("startDate", leaveRequest.startDate);
      leaveData.append("endDate", leaveRequest.endDate);
      leaveData.append("reason", leaveRequest.reason);
      if (leaveRequest.proof) {
        leaveData.append("proof", leaveRequest.proof);
      }
      if (session?.user?.role === "team_manager" && leaveRequest.transferTo) {
        leaveData.append("transferTo", leaveRequest.transferTo);
      }
      const response = await fetch("/api/member/leave-request", {
        method: "POST",
        body: leaveData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to submit leave request (HTTP ${response.status})`);
      }
      setSuccess("Leave request submitted successfully!");
      setLeaveRequest({
        startDate: "",
        endDate: "",
        reason: "",
        transferTo: "",
        proof: null,
      });
      setShowLeaveModal(false);
      const historyResponse = await fetch("/api/member/leave-request", { credentials: "include" });
      if (!historyResponse.ok) {
        const text = await historyResponse.text();
        throw new Error(`Failed to refresh leave history: ${historyResponse.statusText || "Unknown error"}`);
      }
      const historyData = await historyResponse.json();
      setLeaveHistory(historyData.requests || []);
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    const { recipientType, recipientId, customName, customWhatsappNumber, subject, message, note, contact } = messageData;

    // Input validation
    if (recipientType === "existing" && (isNaN(parseInt(recipientId)) || !subject.trim() || !message.trim() || !contact.trim())) {
      setError("Please fill in all required fields for existing user");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (recipientType === "custom" && (!customName.trim() || !customWhatsappNumber.trim() || !subject.trim() || !message.trim() || !contact.trim())) {
      setError("Please fill in all required fields for custom recipient");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (recipientType === "custom" && !/^\+?[1-9]\d{1,14}$/.test(customWhatsappNumber.trim())) {
      setError("Invalid WhatsApp number format");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Get recipient name for compiled message
    let recipientName = "";
    if (recipientType === "existing") {
      const recipient = users.find((u) => u.id === parseInt(recipientId));
      recipientName = recipient?.name || "User";
    } else {
      recipientName = customName.trim();
    }

    // Compile message in the same format as backend
    const now = new Date();
    const compiled = `Hi ${recipientName}, ${session?.user?.name || "System"} (from Meed Leadership Group) has sent you a new message. Subject: ${subject}. Message: ${message}${note.trim() ? `. Note: ${note.trim()}` : ""}. If you need assistance, please contact ${contact}. Sent on ${now.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}. Please kindly check the MeedianAI portal for more information [https://meedian-ai-flow.vercel.app/]`;

    // Set compiled message and show confirmation modal
    setCompiledMessage(compiled);
    setShowConfirmMessageModal(true);
  };

  const handleConfirmMessageSend = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { recipientType, recipientId, customName, customWhatsappNumber, subject, message, note, contact } = messageData;
      const response = await fetch("/api/managersCommon/direct-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipientType === "existing" ? parseInt(recipientId) : undefined,
          customName: recipientType === "custom" ? customName : undefined,
          customWhatsappNumber: recipientType === "custom" ? customWhatsappNumber : undefined,
          subject,
          message,
          note: note ?? "",
          contact,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }
      setSuccess("Message sent successfully!");
      setMessageData({
        recipientType: "existing",
        recipientId: "",
        customName: "",
        customWhatsappNumber: "",
        subject: "",
        message: "",
        note: "",
        contact: "admin@mymeedai.org",
      });
      setShowMessageModal(false);
      setShowConfirmMessageModal(false);
      // Refetch sent messages to update the history
      const historyResponse = await fetch("/api/member/sent-messages?mode=custom", { credentials: "include" });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setSentMessages(historyData.messages || []);
      }
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.push(`/dashboard/${session?.user?.role === "team_manager" ? "team_manager" : session?.user?.role}`);
  };

  // stopCurrentMRN removed (MRN not shown here)

  const handleTalkToSuperintendent = () => {
    const superintendent = users.find((user) => user.id === 43);
    if (superintendent?.id) {
      setChatboxOpen(true);
      setChatRecipient(String(superintendent.id));
    } else {
      console.error("Superintendent (id: 43) not found. Users:", users);
      setError("Superintendent not found. Please contact an admin or try again later.");
      setTimeout(() => setError(""), 5000);
    }
  };

  const toRoleLabel = (role) => role.replaceAll("_", " ").toUpperCase();
  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Sidebar section refs
  const sectionProfileRef = useRef(null);
  const sectionWidgetsRef = useRef(null);
  const sectionLeaveHistoryRef = useRef(null);
  const sectionUserInfoRef = useRef(null);
  const sectionChangePasswordRef = useRef(null);

  // Clear open query param function
  const clearOpenQueryParam = () => {
    try {
      const params = new URLSearchParams(searchParams?.toString?.() || "");
      params.delete("open");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    } catch {}
  };

  // Handle opening specific widget/modal via query param from navbar sheet
  useEffect(() => {
    const open = searchParams?.get("open");
    if (!open) return;
    if (open === "leave") {
      setShowLeaveModal(true);
    } else if (open === "direct") {
      setShowMessageModal(true);
    } else if (open === "sent") {
      setShowSentMessageHistoryModal(true);
    } else if (open === "talk") {
      // Wait for users to load before attempting to open the chat
      if (isLoadingUsers) return; // will rerun when loading completes
      if (users && users.length > 0) {
        handleTalkToSuperintendent();
      } else {
        // Fallback: refetch users once if empty
        (async () => {
          try {
            const resp = await fetch("/api/member/users", { credentials: "include" });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok && Array.isArray(data.users) && data.users.length) {
              setUsers(data.users);
              handleTalkToSuperintendent();
            }
          } catch {
            setError("Failed to load users for chat.");
            setTimeout(() => setError(""), 5000);
          }
        })();
      }
    }
  }, [searchParams, isLoadingUsers, users]);

  if (status === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-50"
      >
        <motion.div className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block w-5 h-5 border-3 border-t-teal-600 border-teal-200 rounded-full"
          />
          Loading...
        </motion.div>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-14 left-0 right-0 bottom-14 z-40 flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50/80 dark:from-gray-800/80 dark:to-gray-900/80 p-3 md:p-6"
    >
      <div
        className="relative w-full max-w-[98vw] max-h-[88vh] md:max-h-[86vh] bg-white/85 dark:bg-slate-900/75 border border-teal-200/70 shadow-xl rounded-2xl px-2 md:px-6 py-5 flex flex-col overflow-y-auto backdrop-blur-xl transition-all custom-scrollbar"
        style={{
          boxShadow: "0 8px 32px 0 rgba(16, 42, 67, 0.1), 0 2px 8px 0 rgba(16,42,67,0.08)",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 p-1.5 bg-gray-100/80 hover:bg-gray-300/80 dark:hover:bg-gray-600/80 rounded-full shadow-md border border-gray-200 dark:border-gray-600 transition-all"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </motion.button>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main content */}
          <div className="flex-[2] min-w-[280px] flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <User className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
              Profile Settings
            </h1>
            <AnimatePresence>
              {success && (
                <motion.p
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-green-800 font-medium bg-green-100/90 dark:bg-green-900/90 p-2 rounded-lg shadow-md border border-green-300/50 dark:border-green-700/50 mb-3"
                >
                  {success}
                </motion.p>
              )}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-red-800 font-medium bg-red-100/90 dark:bg-red-900/90 p-2 rounded-lg shadow-md border border-red-300/50 dark:border-red-700/50 mb-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <div ref={sectionProfileRef} />
            <form onSubmit={handleProfileUpdate} className="flex flex-col gap-5 mb-4">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover shadow-xl ring-2 ring-teal-300/60 border border-teal-600/50"
                    />
                    <label
                      htmlFor="profile-image"
                      className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full cursor-pointer hover:bg-teal-700 transition shadow-md border border-white/40"
                    >
                      <Camera size={18} />
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleImageDelete}
                    className="text-red-600 hover:text-red-700 text-xs font-medium transition"
                    disabled={isLoading || !imagePreview || imagePreview === "/default-avatar.png"}
                  >
                    Remove Profile Picture
                  </motion.button>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">WhatsApp Number</label>
                    <input
                      type="tel"
                      name="whatsapp_number"
                      value={formData.whatsapp_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="whatsapp_enabled"
                      checked={formData.whatsapp_enabled}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      Enable WhatsApp Notifications
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 shadow-md transition"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Profile"}
                </motion.button>
              </div>
            </form>
            <div ref={sectionWidgetsRef} className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50" />
            <div ref={sectionLeaveHistoryRef} className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Leave History
              </h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistoryModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-md transition"
                disabled={isLoading}
              >
                View Leave History
              </motion.button>
            </div>
          </div>
          <div className="flex-[1] min-w-[260px] max-w-[400px] flex flex-col">
            <div className="sticky top-4 space-y-4">
{/* User Info + Settings */}
              <div className="bg-gradient-to-br from-blue-50/60 to-blue-100/80 dark:from-slate-800/80 dark:to-slate-900/70 rounded-xl shadow-md border border-teal-100/70 dark:border-slate-700 p-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  User Information
                </h2>
                <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div ref={sectionUserInfoRef} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Email</label>
                  <p className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700">
                    {session?.user?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Role</label>
                  <p className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700">
                    {session?.user?.role?.replace("_", " ") || "N/A"}
                  </p>
                </div>
                {session?.user?.role === "team_manager" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Team Manager Type</label>
                    <p className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700">
                      {session?.user?.team_manager_type?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">MRI Roles</label>
                  <p className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700">
                    {isLoadingUsers ? "Loading..." : 
                      users
                        .find((u) => u.id === parseInt(session?.user?.id))
                        ?.mriRoles?.length > 0
                        ? users
                            .find((u) => u.id === parseInt(session?.user?.id))
                            ?.mriRoles.map(toRoleLabel)
                            .join(", ") 
                        : "None"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Reports To</label>
                  <p className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700">
                    {immediateSupervisor?.name || "None"} {immediateSupervisor?.role ? `(${immediateSupervisor.role})` : ""}
                  </p>
                </div>
              </div>
              <form ref={sectionChangePasswordRef} onSubmit={handlePasswordUpdate} className="grid gap-3 mt-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-md transition"
                    disabled={isLoading}
                  >
                    {isLoading ? "Changing..." : "Change Password"}
                  </motion.button>
                </div>
              </form>
            </div>
            {/* Close sticky sidebar container */}
          </div>
        </div>
        {/* Ensure flex row wrapper fully closed */}
        
        <AnimatePresence>
          {showLeaveModal && (
            <motion.div
              key="leave-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-3 z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-md p-5 w-full max-w-sm border border-teal-200/70 dark:border-slate-700"
              >
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Submit Leave Request
                </h2>
                <form onSubmit={handleLeaveSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={leaveRequest.startDate}
                      onChange={handleLeaveChange}
                      className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={leaveRequest.endDate}
                      onChange={handleLeaveChange}
                      className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Reason</label>
                    <textarea
                      name="reason"
                      value={leaveRequest.reason}
                      onChange={handleLeaveChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          setLeaveRequest((prev) => ({
                            ...prev,
                            reason: prev.reason + "\n",
                          }));
                        }
                      }}
                      className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                      rows={3}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Supporting Document (Optional)</label>
                    <input
                      type="file"
                      name="proof"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={handleLeaveChange}
                      className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                      disabled={isLoading}
                    />
                  </div>
                  {session?.user?.role === "team_manager" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Transfer Role To</label>
                      <select
                        name="transferTo"
                        value={leaveRequest.transferTo}
                        onChange={handleLeaveChange}
                        className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                        disabled={isLoading}
                      >
                        <option value="">Select User</option>
                        {users
                          .filter((u) => u.id !== parseInt(session?.user?.id) && (u.role === "admin" || u.role === "team_manager"))
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowLeaveModal(false)}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg text-xs font-medium hover:bg-gray-500 shadow-md transition"
                      disabled={isLoading}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-md transition"
                      disabled={isLoading}
                    >
                      {isLoading ? "Submitting..." : "Submit for Approval"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
          {showMessageModal && ["admin", "team_manager"].includes(session?.user?.role) && (
            <motion.div
              key="message-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-3 z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 dark:bg-slate-900/70 rounded-xl shadow-md p-5 w-full max-w-3xl border border-teal-200/70 dark:border-slate-700 backdrop-blur-xl"
              >
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-600" />
                  Send Direct WhatsApp Message
                </h2>
                <form onSubmit={handleMessageSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                        <input
                          type="radio"
                          name="recipientType"
                          value="existing"
                          checked={messageData.recipientType === "existing"}
                          onChange={handleMessageChange}
                          className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-500 border-gray-300"
                          disabled={isLoading}
                        />
                        Existing User
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                        <input
                          type="radio"
                          name="recipientType"
                          value="custom"
                          checked={messageData.recipientType === "custom"}
                          onChange={handleMessageChange}
                          className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-500 border-gray-300"
                          disabled={isLoading}
                        />
                        Custom Recipient
                      </label>
                    </div>
                    {messageData.recipientType === "existing" ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                          <UserCircle className="w-3.5 h-3.5 text-teal-600" />
                          Recipient
                        </label>
                        <select
                          name="recipientId"
                          value={messageData.recipientId}
                          onChange={handleMessageChange}
                          className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                          required
                          disabled={isLoading}
                        >
                          <option value="">Select User</option>
                          {users
                            .filter((u) => u.id !== parseInt(session?.user?.id))
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.role})
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                            <UserCircle className="w-3.5 h-3.5 text-teal-600" />
                            Recipient Name
                          </label>
                          <input
                            type="text"
                            name="customName"
                            value={messageData.customName}
                            onChange={handleMessageChange}
                            className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                            required
                            disabled={isLoading}
                            placeholder="Enter recipient name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            WhatsApp Number
                          </label>
                          <input
                            type="tel"
                            name="customWhatsappNumber"
                            value={messageData.customWhatsappNumber}
                            onChange={handleMessageChange}
                            className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                            required
                            disabled={isLoading}
                            placeholder="+1234567890"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={messageData.subject}
                        onChange={handleMessageChange}
                        className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                        required
                        disabled={isLoading}
                        placeholder="Enter message subject"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                        Message
                      </label>
                      <textarea
                        name="message"
                        value={messageData.message}
                        onChange={handleMessageChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            setMessageData((prev) => ({
                              ...prev,
                              message: prev.message + "\n",
                            }));
                          }
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                        rows={3}
                        required
                        disabled={isLoading}
                        placeholder="Enter your message"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Additional Note (Optional)
                      </label>
                      <textarea
                        name="note"
                        value={messageData.note}
                        onChange={handleMessageChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            setMessageData((prev) => ({
                              ...prev,
                              note: prev.note + "\n",
                            }));
                          }
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                        rows={3}
                        disabled={isLoading}
                        placeholder="Enter additional note"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        Contact Info
                      </label>
                      <input
                        type="text"
                        name="contact"
                        value={messageData.contact}
                        onChange={handleMessageChange}
                        className="w-full px-3 py-1.5 border rounded-lg bg-gray-50/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-teal-500 text-sm text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700"
                        required
                        disabled={isLoading}
                        placeholder="Enter contact info (e.g., email or phone)"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowMessageModal(false)}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg text-xs font-medium hover:bg-gray-500 shadow-md transition"
                      disabled={isLoading}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-md transition"
                      disabled={isLoading}
                    >
                      {isLoading ? "Preparing..." : "Preview Message"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
          {showConfirmMessageModal && (
            <motion.div
              key="confirm-message-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-3 z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-md p-5 w-full max-w-lg border border-teal-200/70 dark:border-slate-700"
              >
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-600" />
                  Confirm Message
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                  Please review the message below as it will be sent to the recipient:
                </p>
                <div className="p-3 bg-gray-50/90 dark:bg-slate-800/90 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{compiledMessage}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setShowConfirmMessageModal(false)}
                    className="px-4 py-2 bg-gray-400 text-white rounded-lg text-xs font-medium hover:bg-gray-500 shadow-md transition"
                    disabled={isLoading}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleConfirmMessageSend}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-md transition"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Message"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showHistoryModal && (
            <motion.div
              key="history-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-3 z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-md p-5 w-full max-w-3xl max-h-[70vh] overflow-y-auto border border-teal-200/70 dark:border-slate-700"
              >
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Leave History
                </h2>
                {leaveHistory.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">No leave requests found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-700 dark:text-gray-200">
                      <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50/90 dark:bg-slate-800/90">
                        <tr>
                          <th className="px-3 py-2">Start Date</th>
                          <th className="px-3 py-2">End Date</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Submitted To</th>
                          <th className="px-3 py-2">Proof</th>
                          <th className="px-3 py-2">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveHistory.map((request) => (
                          <tr key={request.id} className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/90 dark:hover:bg-slate-800/90">
                            <td className="px-3 py-2">{new Date(request.startDate).toLocaleDateString()}</td>
                            <td className="px-3 py-2">{new Date(request.endDate).toLocaleDateString()}</td>
                            <td className="px-3 py-2">{request.reason}</td>
                            <td className="px-3 py-2 capitalize">{request.status}</td>
                            <td className="px-3 py-2">{request.supervisorName || "N/A"}</td>
                            <td className="px-3 py-2">
                              {request.proof ? (
                                <a
                                  href={request.proof}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:text-teal-700"
                                >
                                  View
                                </a>
                              ) : (
                                "None"
                              )}
                            </td>
                            <td className="px-3 py-2">{new Date(request.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowHistoryModal(false)}
                    className="px-4 py-2 bg-gray-400 text-white rounded-lg text-xs font-medium hover:bg-gray-500 shadow-md transition"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showSentMessageHistoryModal && ["admin", "team_manager"].includes(session?.user?.role) && (
            <motion.div
              key="sent-message-history-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-3 z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-md p-5 w-full max-w-4xl max-h-[70vh] overflow-y-auto border border-teal-200/70 dark:border-slate-700"
              >
                <AllMessageHistory
                  sentMessages={sentMessages}
                  onClose={() => {
                    setShowSentMessageHistoryModal(false);
                    clearOpenQueryParam();
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #b6e0fe66;
            border-radius: 6px;
          }
          .custom-scrollbar {
            scrollbar-color: #60a5fa44 transparent;
            scrollbar-width: thin;
          }
          html.dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #2563eb77;
          }
          .glassmorphism {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          html.dark .glassmorphism {
            background: rgba(30, 41, 59, 0.9);
          }
        `}</style>
        {/* Extra closures to balance wrappers */}
        </div>
        </div>
      </div>
    </motion.div>
  );
}
