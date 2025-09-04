import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  pgEnum,
  time,
  jsonb,
  index,
  uniqueIndex,
   date,
} from "drizzle-orm/pg-core";

/* -------------------- ENUMS -------------------- */
export const roleEnum = pgEnum("role", ["admin", "team_manager", "member"]);
export const teamManagerTypeEnum = pgEnum("team_manager_type", [
  "head_incharge",
  "coordinator",
  "accountant",
  "chief_counsellor",
  "hostel_incharge",
  "principal",
]);
export const statusEnum = pgEnum("status", [
  "not_started",
  "in_progress",
  "pending_verification",
  "verified",
  "done",
  "not_done",
]);
export const taskTypeEnum = pgEnum("task_type", ["assigned", "routine"]);
export const userTypeEnum = pgEnum("user_type", ["residential", "non_residential", "semi_residential"]);
// export const messageStatusEnum = pgEnum("message_status", ["sent", "read"]);
export const weekNameEnum = pgEnum("week_name", ["General", "Exam", "Event", "Holiday"]);
export const studentStatusEnum = pgEnum("student_status", ["hosteller", "dayscholar"]);
export const defaulterTypeEnum = pgEnum("defaulter_type", ["punctuality", "language", "discipline"]);
export const memberScopeEnum = pgEnum("member_scope", ["o_member", "i_member", "s_member"]);
export const announcementTargetEnum = pgEnum("announcement_target", ["team_members", "students", "all"]);
export const announcementProgramEnum = pgEnum("announcement_program", ["MSP", "MSP-E", "MHCP", "MNP", "MGHP", "MAP", "M4E", "Other"]);
export const noteCategoryEnum = pgEnum("note_category", ["MSP", "MHCP", "MHP", "MOP", "Other", "Building Home"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "upi", "bank"]);
export const meRightNowTypeEnum = pgEnum("me_right_now_type", [
  "assigned",
  "routine",
  // MRI families
  "amri",   // academic MRI categories (MSP, MHCP1, MHCP2, Day Close [no entry])
  "nmri",   // non-academic MRI slots (by dailySlots)
  "rmri",   // role-based MRI (from userMriRoles)
  "mri",    // legacy (kept for compatibility)
  // external/schedule and custom
  "omri",   // outside scheduling: MOP1, MOP2, MOP1L, MOP3
  "custom",
]);

// Update messageStatusEnum to include "failed"
export const messageStatusEnum = pgEnum("message_status", ["sent", "read", "failed"]);
export const messageTypeEnum = pgEnum("message_type", ["direct", "task_update"]);

// NEW: recipient type enum for the consolidated table
export const directRecipientTypeEnum = pgEnum("direct_recipient_type", ["existing", "custom"]);



export const MRI_ROLE_OPTIONS = [
  "nmri_moderator",
  "msp_ele_moderator", // New role for MSP-Ele division
  "msp_pre_moderator", // New role for MSP-Pre division
  "mhcp1_moderator",
  "mhcp2_moderator",
  "events_moderator",
  "assessment_moderator",
  "sports_moderator",
  "util_moderator",
];
export const mriRoleEnum = pgEnum("mri_role", MRI_ROLE_OPTIONS);

/* -------------------- A. USERS & MEMBERS -------------------- */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  whatsapp_number: varchar("whatsapp_number", { length: 15 }),
  whatsapp_enabled: boolean("whatsapp_enabled").default(true).notNull(),
  role: roleEnum("role").default("member").notNull(),
  team_manager_type: teamManagerTypeEnum("team_manager_type"),
  type: userTypeEnum("type").default("residential").notNull(),
  member_scope: memberScopeEnum("member_scope").default("i_member").notNull(),
  image: text("image"),
  deep_calendar_token: text("deep_calendar_token").unique(),
  immediate_supervisor: integer("immediate_supervisor").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  idx_whatsapp_number: index("idx_users_whatsapp_number").on(table.whatsapp_number),
  idx_email: index("idx_users_email").on(table.email),
}));

/* -------------------- G. MASTER ACADEMICS (CLASSES & STUDENTS) -------------------- */
export const Classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const Students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  admissionNumber: varchar("admission_number", { length: 50 }).unique(),
  admissionDate: timestamp("admission_date"),
  aadharNumber: varchar("aadhar_number", { length: 20 }),
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender", { length: 10 }),
  classId: integer("class_id").notNull().references(() => Classes.id, { onDelete: "restrict" }),
  sectionType: varchar("section_type", { length: 20 }),
  isHosteller: boolean("is_hosteller").default(false),
  transportChosen: boolean("transport_chosen").default(false),
  guardianPhone: varchar("guardian_phone", { length: 20 }),
  guardianName: varchar("guardian_name", { length: 255 }),
  guardianWhatsappNumber: varchar("guardian_whatsapp_number", { length: 20 }),
  motherName: varchar("mother_name", { length: 255 }),
  address: varchar("address", { length: 255 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  feeStatus: varchar("fee_status", { length: 20 }).default("Pending"),
  status: varchar("status", { length: 20 }).default("active"),
  accountOpened: boolean("account_opened").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  notes: jsonb("notes").default(JSON.stringify([])),
}, (t) => ({
  idxClass: index("students_class_idx").on(t.classId),
  idxAdmNo: index("students_admno_idx").on(t.admissionNumber),
}));

export const students = Students;

/* -------------------- B. DAILY SLOTS MODULE -------------------- */
export const dailySlots = pgTable("daily_slots", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  hasSubSlots: boolean("has_sub_slots").default(false).notNull(),
  assignedMemberId: integer("assigned_member_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailySlotLogs = pgTable("daily_slot_logs", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").references(() => dailySlots.id).notNull(),
  date: timestamp("date").notNull(),
  studentId: integer("student_id").references(() => Students.id).notNull(),
  status: text("status").notNull(),
  defaulter_type: defaulterTypeEnum("defaulter_type"),
  comment: text("comment"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idx_slot_date: index("idx_daily_slot_logs_slot_date").on(table.slotId, table.date),
}));

export const dailySlotAssignments = pgTable("daily_slot_assignments", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").references(() => dailySlots.id).notNull(),
  memberId: integer("member_id").references(() => users.id).notNull(),
  className: varchar("class_name", { length: 100 }),
  subject: varchar("subject", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* -------------------- C. ROUTINE TASKS -------------------- */
export const routineTasks = pgTable("routine_tasks", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  memberId: integer("member_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const routineTaskLogs = pgTable("routine_task_logs", {
  id: serial("id").primaryKey(),
  routineTaskId: integer("routine_task_id").references(() => routineTasks.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const routineTaskDailyStatuses = pgTable("routine_task_daily_statuses", {
  id: serial("id").primaryKey(),
  routineTaskId: integer("routine_task_id").references(() => routineTasks.id).notNull(),
  date: timestamp("date").notNull(),
  status: statusEnum("status").default("not_started").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  comment: text("comment"),
  isLocked: boolean("is_locked").default(false).notNull(),
}, (table) => ({
  idx_routine_task_date: index("idx_routine_task_daily_statuses_task_date").on(table.routineTaskId, table.date),
}));

/* -------------------- D. ASSIGNED TASKS -------------------- */
export const assignedTasks = pgTable("assigned_tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  taskType: taskTypeEnum("task_type").default("assigned").notNull(),
  deadline: timestamp("deadline"),
  resources: text("resources"),
}, (table) => ({
  idx_created_by: index("idx_assigned_tasks_created_by").on(table.createdBy),
}));

export const assignedTaskStatus = pgTable("assigned_task_status", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => assignedTasks.id, { onDelete: "cascade" }).notNull(),
  memberId: integer("member_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: statusEnum("status").default("not_started").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  comment: text("comment"),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  pinned: boolean("pinned").default(false).notNull(),
  savedForLater: boolean("saved_for_later").default(false).notNull(),
}, (table) => ({
  idx_task_member: index("idx_assigned_task_status_task_member").on(table.taskId, table.memberId),
}));

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  taskStatusId: integer("task_status_id").references(() => assignedTaskStatus.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: statusEnum("status").default("not_started").notNull(),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignedTaskLogs = pgTable("assigned_task_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => assignedTasks.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: "cascade" }),
}, (table) => ({
  idx_task_id: index("idx_assigned_task_logs_task_id").on(table.taskId),
}));

/* -------------------- E. MESSAGING & LOGS -------------------- */
// Updated messages table
// Updated messages table

// export const messages = pgTable("messages", {
//   id: serial("id").primaryKey(),
//   senderId: integer("sender_id").references(() => users.id).notNull(),
//   recipientId: integer("recipient_id").references(() => users.id).notNull(),
//   content: text("content").notNull(),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   status: messageStatusEnum("status").default("sent").notNull(),
// }, (table) => ({
//   idx_sender_recipient: index("idx_messages_sender_recipient").on(table.senderId, table.recipientId),
// }));


export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").references(() => users.id).notNull(),
    recipientId: integer("recipient_id").references(() => users.id).notNull(),
    subject: varchar("subject", { length: 255 }),
    message: text("message"), // Nullable to allow migration
    note: text("note"),
    contact: varchar("contact", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    status: messageStatusEnum("status").default("sent").notNull(),
    messageType: messageTypeEnum("message_type").default("direct").notNull(),
    content: text("content"), // Keep for backward compatibility
  },
  (table) => ({
    idx_sender_recipient: index("idx_messages_sender_recipient").on(table.senderId, table.recipientId),
  })
);

// Non-Meedian messages table (unchanged, already correct)
export const nonMeeDianMessages = pgTable(
  "non_meedian_messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").references(() => users.id).notNull(),
    customName: varchar("custom_name", { length: 255 }).notNull(),
    customWhatsappNumber: varchar("custom_whatsapp_number", { length: 15 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    message: text("message").notNull(),
    note: text("note"),
    contact: varchar("contact", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    status: messageStatusEnum("status").default("sent").notNull(),
  },
  (table) => ({
    idx_sender: index("idx_non_meedian_messages_sender").on(table.senderId),
  })
);

// NEW: single consolidated table for both existing + custom recipients
export const directWhatsappMessages = pgTable(
  "direct_whatsapp_messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").references(() => users.id).notNull(),

    // "existing" or "custom"
    recipientType: directRecipientTypeEnum("recipient_type").notNull(),

    // If recipientType === "existing"
    recipientUserId: integer("recipient_user_id").references(() => users.id),

    // If recipientType === "custom" (also useful to copy for existing for easier reads)
    recipientName: varchar("recipient_name", { length: 255 }),
    recipientWhatsappNumber: varchar("recipient_whatsapp_number", { length: 15 }),

    // Message content
    subject: varchar("subject", { length: 255 }).notNull(),
    message: text("message").notNull(),
    note: text("note"),
    contact: varchar("contact", { length: 255 }).notNull(),

    // Delivery info
    status: messageStatusEnum("status").default("sent").notNull(), // sent | read | failed
    twilioSid: varchar("twilio_sid", { length: 64 }),
    error: text("error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    idx_sender_created: index("idx_dwm_sender_created").on(t.senderId, t.createdAt),
    idx_recipient_user: index("idx_dwm_recipient_user").on(t.recipientUserId),
    idx_recipient_type: index("idx_dwm_recipient_type").on(t.recipientType),
  })
);

export const generalLogs = pgTable("general_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberHistory = pgTable("member_history", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => users.id).notNull(),
  taskType: taskTypeEnum("task_type").notNull(),
  taskId: integer("task_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: statusEnum("status").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* -------------------- F. MISC / SYSTEM -------------------- */
export const openCloseTimes = pgTable("open_close_times", {
  id: serial("id").primaryKey(),
  userType: userTypeEnum("user_type").notNull(),
  dayOpenTime: time("day_open_time").notNull(),
  dayCloseTime: time("day_close_time").notNull(),
  closingWindowStart: time("closing_window_start").notNull(),
  closingWindowEnd: time("closing_window_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userOpenCloseTimes = pgTable("user_open_close_times", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dayOpenedAt: time("day_opened_at").notNull(),
  dayClosedAt: time("day_closed_at"),
  useCustomTimes: boolean("use_custom_times").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schoolCalendar = pgTable("school_calendar", {
  id: serial("id").primaryKey(),
  major_term: varchar("major_term", { length: 50 }).notNull(),
  minor_term: varchar("minor_term", { length: 50 }).notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  name: weekNameEnum("name").default("General").notNull(),
  week_number: integer("week_number"),
  is_major_term_boundary: boolean("is_major_term_boundary").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  target: announcementTargetEnum("target").notNull(),
  program: announcementProgramEnum("program").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  attachments: text("attachments").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dayCloseRequests = pgTable("day_close_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  mriCleared: boolean("mri_cleared").default(true).notNull(),
  mriReport: jsonb("mri_report"),
  assignedTasksUpdates: jsonb("assigned_tasks_updates"),
  routineTasksUpdates: jsonb("routine_tasks_updates"),
  routineLog: text("routine_log"),
  generalLog: text("general_log"),
  ISRoutineLog: text("is_routine_log"),
  ISGeneralLog: text("is_general_log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
}, (table) => ({
  idx_user_date: index("idx_day_close_requests_user_date").on(table.userId, table.date),
}));

export const notCompletedTasks = pgTable("not_completed_tasks", {
  id: serial("id").primaryKey(),
  taskType: taskTypeEnum("task_type").notNull(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userNotes = pgTable("user_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  category: noteCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  idx_user_id: index("idx_user_notes_user_id").on(table.userId),
}));

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason").notNull(),
  proof: text("proof"),
  transferTo: integer("transfer_to").references(() => users.id),
  status: leaveStatusEnum("leave_status").default("pending").notNull(),
  submittedTo: integer("submitted_to").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
}, (table) => ({
  idx_user_date: index("idx_leave_requests_user_date").on(table.userId, table.startDate),
}));

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  conversation_sid: text("conversation_sid"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// /* -------------------- G. FINANCE / ACCOUNTING -------------------- */
export const accountingSettings = pgTable("accounting_settings", {
  id: serial("id").primaryKey(),
  singleton: boolean("singleton").default(true).notNull(),
  booksStartDate: timestamp("books_start_date"),
  openingCash: integer("opening_cash").notNull().default(0),
  openingUPI: integer("opening_upi").notNull().default(0),
  openingBank: integer("opening_bank").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqSingleton: uniqueIndex("accounting_settings_singleton_idx").on(t.singleton),
}));

// export const expenses = pgTable("expenses", {
//   id: serial("id").primaryKey(),
//   category: varchar("category", { length: 120 }).notNull(),
//   amount: integer("amount").notNull().default(0),
//   paidBy: paymentMethodEnum("paid_by").notNull().default("cash"),
//   note: text("note"),
//   paidAt: timestamp("paid_at").defaultNow(),
//   createdBy: integer("created_by"),
// }, (t) => ({
//   idxPaidAt: index("expenses_paidat_idx").on(t.paidAt),
//   idxPaidBy: index("expenses_paidby_idx").on(t.paidBy),
// }));

// export const feeReceipts = pgTable("fee_receipts", {
//   id: serial("id").primaryKey(),
//   studentId: integer("student_id").references(() => Students.id, { onDelete: "set null" }),
//   studentName: varchar("student_name", { length: 255 }),
//   className: varchar("class_name", { length: 100 }),
//   monthFor: varchar("month_for", { length: 10 }),
//   amount: integer("amount").notNull().default(0),
//   method: paymentMethodEnum("method").notNull().default("cash"),
//   reference: varchar("reference", { length: 100 }),
//   collectedAt: timestamp("collected_at").defaultNow(),
//   createdBy: integer("created_by"),
// }, (t) => ({
//   idxCollect: index("fee_receipts_collectedat_idx").on(t.collectedAt),
//   idxMethod: index("fee_receipts_method_idx").on(t.method),
// }));

// export const transportFees = pgTable("transport_fees", {
//   id: serial("id").primaryKey(),
//   studentId: integer("student_id").references(() => Students.id, { onDelete: "set null" }),
//   studentName: varchar("student_name", { length: 255 }),
//   className: varchar("class_name", { length: 100 }),
//   monthFor: varchar("month_for", { length: 10 }),
//   amount: integer("amount").notNull().default(0),
//   method: paymentMethodEnum("method").notNull().default("cash"),
//   reference: varchar("reference", { length: 100 }),
//   collectedAt: timestamp("collected_at").defaultNow(),
//   createdBy: integer("created_by"),
// }, (t) => ({
//   idxCollect: index("transport_fees_collectedat_idx").on(t.collectedAt),
// }));

// export const admissionFees = pgTable("admission_fees", {
//   id: serial("id").primaryKey(),
//   studentId: integer("student_id").references(() => Students.id, { onDelete: "set null" }),
//   studentName: varchar("student_name", { length: 255 }),
//   className: varchar("class_name", { length: 100 }),
//   amount: integer("amount").notNull().default(0),
//   method: paymentMethodEnum("method").notNull().default("cash"),
//   reference: varchar("reference", { length: 100 }),
//   collectedAt: timestamp("collected_at").defaultNow(),
//   createdBy: integer("created_by"),
// }, (t) => ({
//   idxCollect: index("admission_fees_collectedat_idx").on(t.collectedAt),
// }));

// export const accountantDaySummaries = pgTable("accountant_day_summaries", {
//   id: serial("id").primaryKey(),
//   userId: integer("user_id").notNull(),
//   date: timestamp("date").notNull(),
//   cash: integer("cash").notNull().default(0),
//   upi: integer("upi").notNull().default(0),
//   bank: integer("bank").notNull().default(0),
//   transport: integer("transport").notNull().default(0),
//   admissions: integer("admissions").notNull().default(0),
//   expenses: integer("expenses").notNull().default(0),
//   openingCash: integer("opening_cash").notNull().default(0),
//   closingCash: integer("closing_cash").notNull().default(0),
//   notes: text("notes"),
//   adjustments: jsonb("adjustments").default(JSON.stringify({ receiptsAdj: 0, expensesAdj: 0, note: "" })),
//   expenseBreakdown: jsonb("expense_breakdown").default(JSON.stringify({})),
//   isLocked: boolean("is_locked").default(false),
//   createdAt: timestamp("created_at").defaultNow(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// }, (t) => ({
//   uniqUserDate: uniqueIndex("accountant_summary_user_date_unique").on(t.userId, t.date),
//   idxDate: index("accountant_summary_date_idx").on(t.date),
// }));

// /* -------------------- H. STUDENT ACCOUNTS & FEES -------------------- */
// export const StudentAccounts = pgTable("student_accounts", {
//   id: serial("id").primaryKey(),
//   studentId: integer("student_id").notNull().references(() => Students.id, { onDelete: "cascade" }).unique(),
//   ledgerNo: varchar("ledger_no", { length: 50 }).notNull().unique(),
//   accountType: varchar("account_type", { length: 20 }).notNull().default("general"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// export const Fees = pgTable("fees", {
//   id: serial("id").primaryKey(),
//   classId: integer("class_id").notNull().references(() => Classes.id, { onDelete: "cascade" }),
//   isHosteller: boolean("is_hosteller").default(false),
//   admissionFee: integer("admission_fee").notNull().default(0),
//   monthlyDayScholarFee: integer("monthly_day_scholar_fee").notNull().default(0),
//   monthlyHostellerFee: integer("monthly_hosteller_fee").notNull().default(0),
//   hostelSupplyFee: jsonb("hostel_supply_fee")
//     .default(JSON.stringify({ total: 0, breakdown: { copy: 0, book: 0, uniform: 0, hostelDress: 0 } })),
//   dayScholarSupplyFee: jsonb("day_scholar_supply_fee")
//     .default(JSON.stringify({ total: 0, breakdown: { copy: 0, book: 0, uniform: 0 } })),
//   transportFee: integer("transport_fee").default(0),
//   otherFees: integer("other_fees").default(0),
//   createdAt: timestamp("created_at").defaultNow(),
// }, (t) => ({
//   uniqClassMode: uniqueIndex("fees_class_mode_unique").on(t.classId, t.isHosteller),
// }));

// export const StudentFees = pgTable("student_fees", {
//   id: serial("id").primaryKey(),
//   studentId: integer("student_id").notNull().references(() => Students.id, { onDelete: "cascade" }),
//   accountId: integer("account_id").notNull().references(() => StudentAccounts.id, { onDelete: "cascade" }),
//   oneTimeFeeDue: integer("one_time_fee_due").default(0),
//   oneTimeFeePaid: integer("one_time_fee_paid").default(0),
//   otherFeesDue: integer("other_fees_due").default(0),
//   otherFeesPaid: integer("other_fees_paid").default(0),
//   monthlyFees: jsonb("monthly_fees").default(JSON.stringify([])),
//   totalPaid: integer("total_paid").default(0),
//   dueAmount: integer("due_amount").default(0),
//   createdAt: timestamp("created_at").defaultNow(),
// }, (t) => ({
//   uniqStudAcc: uniqueIndex("student_fees_student_account_unique").on(t.studentId, t.accountId),
// }));

/* -------------------- MRI ROLES (USER ↔ ROLE MAPPING) -------------------- */
export const userMriRoles = pgTable("user_mri_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mriRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqUserRole: uniqueIndex("user_mri_roles_user_role_unique").on(t.userId, t.role),
  idxUser: index("idx_user_mri_roles_user").on(t.userId),
}));

/* -------------------- MRI DEFALTER LOGS (R-MRIs — nmri_modulator v1) -------------------- */
export const mriDefaulterLogs = pgTable(
  "mri_defaulter_logs",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(), // pure date so equality with "YYYY-MM-DD" works
    defaulter_type: defaulterTypeEnum("defaulter_type").notNull(),
    studentId: integer("student_id").notNull().references(() => Students.id, { onDelete: "cascade" }),
    reportedBy: integer("reported_by").notNull().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqDateTypeStudent: uniqueIndex("mri_defaulter_logs_date_type_student_idx").on(
      t.date,
      t.defaulter_type,
      t.studentId
    ),
    idxDate: index("mri_defaulter_logs_date_idx").on(t.date),
  })
);



export const meRightNowSessions = pgTable("me_right_now_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: meRightNowTypeEnum("type").notNull(),                       // assigned | routine | mri
  itemId: text("item_id").notNull(),                                // store as string (works for ints/enums)
  itemTitle: varchar("item_title", { length: 255 }).notNull(),
  note: text("note"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  active: boolean("active").default(true).notNull(),
}, (t) => ({
  idxActive: index("mrr_active_idx").on(t.active),
  idxUserActive: index("mrr_user_active_idx").on(t.userId, t.active),
}));
