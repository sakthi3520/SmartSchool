// ============================================================
// SmartSchool API Client
// Base URL configured via NEXT_PUBLIC_API_URL (defaults to localhost:5000)
// ============================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Method = "GET" | "POST" | "PUT" | "DELETE";

async function apiRequest<T = unknown>(
  path: string,
  options: { method?: Method; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("smartschool_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
}

// ==================== STUDENTS ====================

export interface Student {
  _id: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  email: string;
  phone: string;
}

export interface StudentFormInput {
  name: string;
  admissionNo: string;
  className: string;
  section?: string;
  email: string;
  phone: string;
}

export interface StudentListResponse {
  success: boolean;
  count: number;
  students: Student[];
}

export interface RegisteredStudentAccount {
  _id: string;
  name: string;
  email: string;
  mobile: string;
}

export async function getRegisteredStudents(): Promise<{
  success: boolean;
  count: number;
  students: RegisteredStudentAccount[];
}> {
  return apiRequest<{
    success: boolean;
    count: number;
    students: RegisteredStudentAccount[];
  }>("/auth/registered-students");
}

export async function getStudents(): Promise<StudentListResponse> {
  return apiRequest<StudentListResponse>("/students");
}

export async function addStudent(student: StudentFormInput): Promise<{ success: boolean; message: string; student?: Student }> {
  return apiRequest<{ success: boolean; message: string; student?: Student }>("/students", {
    method: "POST",
    body: student,
  });
}

export async function updateStudent(id: string, studentData: Partial<StudentFormInput>): Promise<{ success: boolean; message: string; student?: Student }> {
  return apiRequest<{ success: boolean; message: string; student?: Student }>(`/students/${id}`, {
    method: "PUT",
    body: studentData,
  });
}

export async function deleteStudent(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/students/${id}`, {
    method: "DELETE",
  });
}

// ==================== TEACHERS ====================

export interface Teacher {
  _id: string;
  name: string;
  employeeId: string;
  subject: string;
  email: string;
  phone: string;
  qualification: string;
}

export interface TeacherFormInput {
  name: string;
  employeeId: string;
  subject: string;
  email: string;
  phone: string;
  qualification: string;
}

export interface TeacherListResponse {
  success: boolean;
  count: number;
  teachers: Teacher[];
}

export async function getTeachers(): Promise<TeacherListResponse> {
  return apiRequest<TeacherListResponse>("/teachers");
}

export async function addTeacher(teacher: TeacherFormInput): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  return apiRequest<{ success: boolean; message: string; teacher?: Teacher }>("/teachers", {
    method: "POST",
    body: teacher,
  });
}

export async function updateTeacher(id: string, teacherData: Partial<TeacherFormInput>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  return apiRequest<{ success: boolean; message: string; teacher?: Teacher }>(`/teachers/${id}`, {
    method: "PUT",
    body: teacherData,
  });
}

export async function deleteTeacher(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/teachers/${id}`, {
    method: "DELETE",
  });
}

// ==================== ATTENDANCE ====================

export type AttendanceStatus = "Present" | "Absent";

export interface AttendanceRecord {
  _id: string;
  student: string | { _id: string; name: string; admissionNo: string; className: string; section: string };
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceResponse {
  success: boolean;
  count: number;
  records: AttendanceRecord[];
}

export async function getAttendance(date: string): Promise<AttendanceResponse> {
  return apiRequest<AttendanceResponse>(`/attendance?date=${date}`);
}

export async function saveAttendance(studentId: string, date: string, status: AttendanceStatus): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  return apiRequest<{ success: boolean; message: string; record?: AttendanceRecord }>("/attendance", {
    method: "POST",
    body: { studentId, date, status },
  });
}

// ==================== MARKS ====================

export interface Mark {
  _id: string;
  student:
    | string
    | {
        _id: string;
        name: string;
        admissionNo: string;
        className?: string;
        section?: string;
      };
  examName: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  createdAt?: string;
}

export interface MarkInput {
  studentId: string;
  examName: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
}

export interface MarksResponse {
  success: boolean;
  count: number;
  marks: Mark[];
}

export async function getMarks(studentId?: string): Promise<MarksResponse> {
  const query = studentId ? `?studentId=${studentId}` : "";
  return apiRequest<MarksResponse>(`/marks${query}`);
}

export async function addMark(mark: MarkInput): Promise<{ success: boolean; message: string; mark?: Mark }> {
  return apiRequest<{ success: boolean; message: string; mark?: Mark }>("/marks", {
    method: "POST",
    body: mark,
  });
}

export async function updateMark(id: string, mark: Partial<MarkInput>): Promise<{ success: boolean; message: string; mark?: Mark }> {
  return apiRequest<{ success: boolean; message: string; mark?: Mark }>(`/marks/${id}`, {
    method: "PUT",
    body: mark,
  });
}

export async function deleteMark(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/marks/${id}`, {
    method: "DELETE",
  });
}

// ==================== AUTH ====================

export interface LoginCredentials {
  name: string;
  password: string;
  selectedRole: "admin" | "teacher" | "student";
}

export interface RegisterInput {
  name: string;
  age: number;
  email: string;
  mobile: string;
  address: string;
  password: string;
  confirmPassword?: string;
  role: "teacher" | "student";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

// ==================== STUDENT PORTAL (logged-in student only) ====================
// The backend identifies the student from the JWT token, so no ids are ever sent.

export interface StudentProfile {
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  email: string;
  phone: string;
  avatar: string;
}

export async function getMyProfile(): Promise<{ success: boolean; linked: boolean; profile: StudentProfile }> {
  return apiRequest("/student-portal/me");
}

export async function getMyAttendance(): Promise<AttendanceResponse> {
  return apiRequest<AttendanceResponse>("/student-portal/attendance");
}

export async function getMyMarks(): Promise<MarksResponse> {
  return apiRequest<MarksResponse>("/student-portal/marks");
}

export type HomeworkStatus = "Pending" | "Submitted" | "Overdue";

export interface Homework {
  _id: string;
  title: string;
  subject: string;
  description: string;
  className: string;
  section: string;
  assignedDate: string;
  dueDate: string;
  createdByName?: string;
  status?: HomeworkStatus; // only filled in for students
  submittedAt?: string | null;
  note?: string;
}

export interface HomeworkInput {
  title: string;
  subject: string;
  description?: string;
  className: string;
  section?: string;
  dueDate: string;
}

export async function getMyHomework(): Promise<{ success: boolean; count: number; homework: Homework[] }> {
  return apiRequest("/student-portal/homework");
}

export async function submitMyHomework(id: string, note?: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/student-portal/homework/${id}/submit`, { method: "POST", body: { note: note || "" } });
}

export async function undoMyHomework(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/student-portal/homework/${id}/submit`, { method: "DELETE" });
}

export interface TimetablePeriod {
  subject: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
}

export interface TimetableDay {
  _id: string;
  className: string;
  section: string;
  day: string;
  periods: TimetablePeriod[];
}

export async function getMyTimetable(): Promise<{ success: boolean; count: number; timetable: TimetableDay[] }> {
  return apiRequest("/student-portal/timetable");
}

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  priority: "normal" | "important";
  className: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
}

export async function getMyAnnouncements(): Promise<{ success: boolean; count: number; announcements: Announcement[] }> {
  return apiRequest("/student-portal/announcements");
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askStudyAssistant(messages: ChatMessage[]): Promise<{ success: boolean; reply: string }> {
  return apiRequest("/student-portal/assistant", { method: "POST", body: { messages } });
}

// ---------- STUDENT AI MESSAGE ----------
export interface StudentAIMessage {
  message: string;
  context?: "attendance" | "marks" | "homework" | "timetable" | "profile" | "announcements";
}

export async function sendStudentAIMessage(message: string): Promise<{ success: boolean; reply: string }> {
  return apiRequest("/student-portal/assistant", {
    method: "POST",
    body: { messages: [{ role: "user", content: message }] },
  });
}

// ==================== TEACHER / ADMIN CONTENT (homework, announcements, timetable) ====================

export async function getAllHomework(className?: string): Promise<{ success: boolean; count: number; homework: Homework[] }> {
  const query = className ? `?className=${encodeURIComponent(className)}` : "";
  return apiRequest(`/homework${query}`);
}

export async function getAllAnnouncements(): Promise<{ success: boolean; count: number; announcements: Announcement[] }> {
  return apiRequest("/announcements");
}

export async function getAllTimetable(className?: string): Promise<{ success: boolean; count: number; timetable: TimetableDay[] }> {
  const query = className ? `?className=${encodeURIComponent(className)}` : "";
  return apiRequest(`/timetable${query}`);
}

export async function createHomework(input: HomeworkInput): Promise<{ success: boolean; message: string; homework?: Homework }> {
  return apiRequest("/homework", { method: "POST", body: input });
}

export async function updateHomework(id: string, input: Partial<HomeworkInput>): Promise<{ success: boolean; message: string; homework?: Homework }> {
  return apiRequest(`/homework/${id}`, { method: "PUT", body: input });
}

export async function deleteHomework(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/homework/${id}`, { method: "DELETE" });
}

export async function postAnnouncement(input: { title: string; message: string; priority?: "normal" | "important"; className?: string }): Promise<{ success: boolean; message: string; announcement?: Announcement }> {
  return apiRequest("/announcements", { method: "POST", body: input });
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/announcements/${id}`, { method: "DELETE" });
}

export async function saveTimetableDay(input: { className: string; section?: string; day: string; periods: TimetablePeriod[] }): Promise<{ success: boolean; message: string; timetable?: TimetableDay }> {
  return apiRequest("/timetable", { method: "POST", body: input });
}