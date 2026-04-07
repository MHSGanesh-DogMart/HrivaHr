// ─── Types ──────────────────────────────────────────────────────────────────

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave'
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'WFH' | 'Half Day'
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'
export type LeaveType = 'CL' | 'SL' | 'PL' | 'LOP'
export type PayrollStatus = 'Processed' | 'Pending' | 'On Hold'
export type TenantPlan = 'Free' | 'Starter' | 'Pro' | 'Enterprise'
export type TenantStatus = 'Active' | 'Suspended' | 'Trial'
export type AttendanceMethod = 'GPS' | 'Selfie' | 'QR' | 'Manual'

export interface Employee {
  id: string
  name: string
  email: string
  department: string
  designation: string
  joinDate: string
  status: EmployeeStatus
  avatar: string
  phone: string
  location: string
  salary: number
  manager: string
  employeeId: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  department: string
  date: string
  clockIn: string
  clockOut: string
  hoursWorked: number
  status: AttendanceStatus
  method: AttendanceMethod
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  department: string
  leaveType: LeaveType
  fromDate: string
  toDate: string
  days: number
  reason: string
  status: LeaveStatus
  appliedOn: string
  avatar: string
}

export interface PayrollRecord {
  id: string
  employeeId: string
  employeeName: string
  designation: string
  department: string
  ctc: number
  basic: number
  hra: number
  deductions: number
  netPay: number
  status: PayrollStatus
  month: string
}

export interface PerformanceRecord {
  id: string
  employeeId: string
  employeeName: string
  department: string
  designation: string
  rating: number
  reviewStatus: 'Completed' | 'Pending' | 'In Progress'
  goalsAchieved: number
  totalGoals: number
  period: string
}

export interface Tenant {
  id: string
  companyName: string
  industry: string
  plan: TenantPlan
  employees: number
  status: TenantStatus
  joinedDate: string
  mrr: number
  contactEmail: string
  location: string
}

// ─── Employees ───────────────────────────────────────────────────────────────

export const employees: Employee[] = [
  {
    id: 'e1',
    employeeId: 'EMP-001',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@company.com',
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    joinDate: '2021-03-15',
    status: 'Active',
    avatar: 'AS',
    phone: '+91 98765 43210',
    location: 'Bangalore',
    salary: 185000,
    manager: 'Priya Mehta',
  },
  {
    id: 'e2',
    employeeId: 'EMP-002',
    name: 'Priya Mehta',
    email: 'priya.mehta@company.com',
    department: 'Engineering',
    designation: 'Engineering Manager',
    joinDate: '2019-07-01',
    status: 'Active',
    avatar: 'PM',
    phone: '+91 98765 43211',
    location: 'Bangalore',
    salary: 240000,
    manager: 'Rahul Kapoor',
  },
  {
    id: 'e3',
    employeeId: 'EMP-003',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@company.com',
    department: 'HR',
    designation: 'HR Manager',
    joinDate: '2020-01-20',
    status: 'Active',
    avatar: 'SR',
    phone: '+91 98765 43212',
    location: 'Hyderabad',
    salary: 145000,
    manager: 'Rahul Kapoor',
  },
  {
    id: 'e4',
    employeeId: 'EMP-004',
    name: 'Amit Patel',
    email: 'amit.patel@company.com',
    department: 'Finance',
    designation: 'Finance Analyst',
    joinDate: '2022-06-01',
    status: 'Active',
    avatar: 'AP',
    phone: '+91 98765 43213',
    location: 'Mumbai',
    salary: 120000,
    manager: 'Kavita Nair',
  },
  {
    id: 'e5',
    employeeId: 'EMP-005',
    name: 'Rahul Kapoor',
    email: 'rahul.kapoor@company.com',
    department: 'Operations',
    designation: 'COO',
    joinDate: '2018-04-10',
    status: 'Active',
    avatar: 'RK',
    phone: '+91 98765 43214',
    location: 'Delhi',
    salary: 420000,
    manager: 'CEO',
  },
  {
    id: 'e6',
    employeeId: 'EMP-006',
    name: 'Kavita Nair',
    email: 'kavita.nair@company.com',
    department: 'Finance',
    designation: 'CFO',
    joinDate: '2017-09-05',
    status: 'Active',
    avatar: 'KN',
    phone: '+91 98765 43215',
    location: 'Mumbai',
    salary: 380000,
    manager: 'CEO',
  },
  {
    id: 'e7',
    employeeId: 'EMP-007',
    name: 'Vikram Singh',
    email: 'vikram.singh@company.com',
    department: 'Sales',
    designation: 'Sales Manager',
    joinDate: '2021-11-15',
    status: 'Active',
    avatar: 'VS',
    phone: '+91 98765 43216',
    location: 'Delhi',
    salary: 175000,
    manager: 'Rahul Kapoor',
  },
  {
    id: 'e8',
    employeeId: 'EMP-008',
    name: 'Deepika Rao',
    email: 'deepika.rao@company.com',
    department: 'Engineering',
    designation: 'Frontend Developer',
    joinDate: '2023-02-01',
    status: 'Active',
    avatar: 'DR',
    phone: '+91 98765 43217',
    location: 'Pune',
    salary: 110000,
    manager: 'Priya Mehta',
  },
  {
    id: 'e9',
    employeeId: 'EMP-009',
    name: 'Suresh Kumar',
    email: 'suresh.kumar@company.com',
    department: 'Operations',
    designation: 'Operations Analyst',
    joinDate: '2022-08-20',
    status: 'On Leave',
    avatar: 'SK',
    phone: '+91 98765 43218',
    location: 'Chennai',
    salary: 95000,
    manager: 'Rahul Kapoor',
  },
  {
    id: 'e10',
    employeeId: 'EMP-010',
    name: 'Ananya Gupta',
    email: 'ananya.gupta@company.com',
    department: 'HR',
    designation: 'HR Executive',
    joinDate: '2023-05-10',
    status: 'Active',
    avatar: 'AG',
    phone: '+91 98765 43219',
    location: 'Bangalore',
    salary: 85000,
    manager: 'Sneha Reddy',
  },
  {
    id: 'e11',
    employeeId: 'EMP-011',
    name: 'Rohan Joshi',
    email: 'rohan.joshi@company.com',
    department: 'Engineering',
    designation: 'Backend Developer',
    joinDate: '2022-01-10',
    status: 'Active',
    avatar: 'RJ',
    phone: '+91 98765 43220',
    location: 'Bangalore',
    salary: 130000,
    manager: 'Priya Mehta',
  },
  {
    id: 'e12',
    employeeId: 'EMP-012',
    name: 'Pooja Iyer',
    email: 'pooja.iyer@company.com',
    department: 'Sales',
    designation: 'Sales Executive',
    joinDate: '2023-07-01',
    status: 'Active',
    avatar: 'PI',
    phone: '+91 98765 43221',
    location: 'Chennai',
    salary: 75000,
    manager: 'Vikram Singh',
  },
  {
    id: 'e13',
    employeeId: 'EMP-013',
    name: 'Manoj Verma',
    email: 'manoj.verma@company.com',
    department: 'Finance',
    designation: 'Accounts Executive',
    joinDate: '2021-06-15',
    status: 'Inactive',
    avatar: 'MV',
    phone: '+91 98765 43222',
    location: 'Delhi',
    salary: 72000,
    manager: 'Kavita Nair',
  },
  {
    id: 'e14',
    employeeId: 'EMP-014',
    name: 'Nisha Pillai',
    email: 'nisha.pillai@company.com',
    department: 'Engineering',
    designation: 'QA Engineer',
    joinDate: '2022-04-20',
    status: 'Active',
    avatar: 'NP',
    phone: '+91 98765 43223',
    location: 'Kochi',
    salary: 105000,
    manager: 'Priya Mehta',
  },
  {
    id: 'e15',
    employeeId: 'EMP-015',
    name: 'Aakash Tiwari',
    email: 'aakash.tiwari@company.com',
    department: 'Operations',
    designation: 'IT Admin',
    joinDate: '2020-09-01',
    status: 'Active',
    avatar: 'AT',
    phone: '+91 98765 43224',
    location: 'Lucknow',
    salary: 88000,
    manager: 'Rahul Kapoor',
  },
]

// ─── Attendance ───────────────────────────────────────────────────────────────

export const attendanceRecords: AttendanceRecord[] = [
  { id: 'a1', employeeId: 'e1', employeeName: 'Arjun Sharma', department: 'Engineering', date: '2026-04-07', clockIn: '09:02', clockOut: '18:15', hoursWorked: 9.2, status: 'Present', method: 'GPS' },
  { id: 'a2', employeeId: 'e2', employeeName: 'Priya Mehta', department: 'Engineering', date: '2026-04-07', clockIn: '09:30', clockOut: '18:30', hoursWorked: 9.0, status: 'Present', method: 'Selfie' },
  { id: 'a3', employeeId: 'e3', employeeName: 'Sneha Reddy', department: 'HR', date: '2026-04-07', clockIn: '10:15', clockOut: '19:00', hoursWorked: 8.75, status: 'Late', method: 'QR' },
  { id: 'a4', employeeId: 'e4', employeeName: 'Amit Patel', department: 'Finance', date: '2026-04-07', clockIn: '', clockOut: '', hoursWorked: 0, status: 'Absent', method: 'Manual' },
  { id: 'a5', employeeId: 'e5', employeeName: 'Rahul Kapoor', department: 'Operations', date: '2026-04-07', clockIn: '08:45', clockOut: '18:00', hoursWorked: 9.25, status: 'Present', method: 'GPS' },
  { id: 'a6', employeeId: 'e6', employeeName: 'Kavita Nair', department: 'Finance', date: '2026-04-07', clockIn: '09:00', clockOut: '', hoursWorked: 0, status: 'WFH', method: 'Manual' },
  { id: 'a7', employeeId: 'e7', employeeName: 'Vikram Singh', department: 'Sales', date: '2026-04-07', clockIn: '09:10', clockOut: '17:45', hoursWorked: 8.58, status: 'Present', method: 'QR' },
  { id: 'a8', employeeId: 'e8', employeeName: 'Deepika Rao', department: 'Engineering', date: '2026-04-07', clockIn: '09:00', clockOut: '18:00', hoursWorked: 9.0, status: 'WFH', method: 'Manual' },
  { id: 'a9', employeeId: 'e9', employeeName: 'Suresh Kumar', department: 'Operations', date: '2026-04-07', clockIn: '', clockOut: '', hoursWorked: 0, status: 'Absent', method: 'Manual' },
  { id: 'a10', employeeId: 'e10', employeeName: 'Ananya Gupta', department: 'HR', date: '2026-04-07', clockIn: '09:05', clockOut: '18:10', hoursWorked: 9.08, status: 'Present', method: 'Selfie' },
  { id: 'a11', employeeId: 'e11', employeeName: 'Rohan Joshi', department: 'Engineering', date: '2026-04-07', clockIn: '09:55', clockOut: '18:50', hoursWorked: 8.92, status: 'Late', method: 'GPS' },
  { id: 'a12', employeeId: 'e12', employeeName: 'Pooja Iyer', department: 'Sales', date: '2026-04-07', clockIn: '09:00', clockOut: '18:00', hoursWorked: 9.0, status: 'Present', method: 'QR' },
]

export const attendanceTrend = [
  { day: 'Mon', present: 210, absent: 24, late: 14 },
  { day: 'Tue', present: 225, absent: 15, late: 8 },
  { day: 'Wed', present: 218, absent: 20, late: 10 },
  { day: 'Thu', present: 230, absent: 12, late: 6 },
  { day: 'Fri', present: 205, absent: 30, late: 13 },
  { day: 'Sat', present: 180, absent: 55, late: 13 },
  { day: 'Today', present: 201, absent: 29, late: 18 },
]

export const departmentHeadcount = [
  { department: 'Engineering', count: 82 },
  { department: 'Sales', count: 54 },
  { department: 'Operations', count: 47 },
  { department: 'Finance', count: 32 },
  { department: 'HR', count: 21 },
  { department: 'Marketing', count: 12 },
]

// ─── Leave ────────────────────────────────────────────────────────────────────

export const leaveRequests: LeaveRequest[] = [
  {
    id: 'l1',
    employeeId: 'e4',
    employeeName: 'Amit Patel',
    department: 'Finance',
    leaveType: 'CL',
    fromDate: '2026-04-10',
    toDate: '2026-04-11',
    days: 2,
    reason: 'Personal work at home town',
    status: 'Pending',
    appliedOn: '2026-04-07',
    avatar: 'AP',
  },
  {
    id: 'l2',
    employeeId: 'e9',
    employeeName: 'Suresh Kumar',
    department: 'Operations',
    leaveType: 'SL',
    fromDate: '2026-04-07',
    toDate: '2026-04-09',
    days: 3,
    reason: 'Fever and doctor prescribed rest',
    status: 'Approved',
    appliedOn: '2026-04-06',
    avatar: 'SK',
  },
  {
    id: 'l3',
    employeeId: 'e12',
    employeeName: 'Pooja Iyer',
    department: 'Sales',
    leaveType: 'PL',
    fromDate: '2026-04-14',
    toDate: '2026-04-18',
    days: 5,
    reason: 'Family vacation - annual trip',
    status: 'Pending',
    appliedOn: '2026-04-05',
    avatar: 'PI',
  },
  {
    id: 'l4',
    employeeId: 'e8',
    employeeName: 'Deepika Rao',
    department: 'Engineering',
    leaveType: 'CL',
    fromDate: '2026-04-08',
    toDate: '2026-04-08',
    days: 1,
    reason: 'Medical appointment',
    status: 'Pending',
    appliedOn: '2026-04-07',
    avatar: 'DR',
  },
  {
    id: 'l5',
    employeeId: 'e11',
    employeeName: 'Rohan Joshi',
    department: 'Engineering',
    leaveType: 'PL',
    fromDate: '2026-03-20',
    toDate: '2026-03-25',
    days: 5,
    reason: 'Wedding',
    status: 'Approved',
    appliedOn: '2026-03-10',
    avatar: 'RJ',
  },
  {
    id: 'l6',
    employeeId: 'e13',
    employeeName: 'Manoj Verma',
    department: 'Finance',
    leaveType: 'LOP',
    fromDate: '2026-03-28',
    toDate: '2026-03-29',
    days: 2,
    reason: 'Unapproved absence',
    status: 'Rejected',
    appliedOn: '2026-03-30',
    avatar: 'MV',
  },
]

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const payrollRecords: PayrollRecord[] = [
  { id: 'p1', employeeId: 'e1', employeeName: 'Arjun Sharma', designation: 'Senior Software Engineer', department: 'Engineering', ctc: 185000, basic: 92500, hra: 37000, deductions: 22200, netPay: 162800, status: 'Processed', month: 'March 2026' },
  { id: 'p2', employeeId: 'e2', employeeName: 'Priya Mehta', designation: 'Engineering Manager', department: 'Engineering', ctc: 240000, basic: 120000, hra: 48000, deductions: 28800, netPay: 211200, status: 'Processed', month: 'March 2026' },
  { id: 'p3', employeeId: 'e3', employeeName: 'Sneha Reddy', designation: 'HR Manager', department: 'HR', ctc: 145000, basic: 72500, hra: 29000, deductions: 17400, netPay: 127600, status: 'Processed', month: 'March 2026' },
  { id: 'p4', employeeId: 'e4', employeeName: 'Amit Patel', designation: 'Finance Analyst', department: 'Finance', ctc: 120000, basic: 60000, hra: 24000, deductions: 14400, netPay: 105600, status: 'Pending', month: 'March 2026' },
  { id: 'p5', employeeId: 'e5', employeeName: 'Rahul Kapoor', designation: 'COO', department: 'Operations', ctc: 420000, basic: 210000, hra: 84000, deductions: 50400, netPay: 369600, status: 'Processed', month: 'March 2026' },
  { id: 'p6', employeeId: 'e6', employeeName: 'Kavita Nair', designation: 'CFO', department: 'Finance', ctc: 380000, basic: 190000, hra: 76000, deductions: 45600, netPay: 334400, status: 'Processed', month: 'March 2026' },
  { id: 'p7', employeeId: 'e7', employeeName: 'Vikram Singh', designation: 'Sales Manager', department: 'Sales', ctc: 175000, basic: 87500, hra: 35000, deductions: 21000, netPay: 154000, status: 'On Hold', month: 'March 2026' },
  { id: 'p8', employeeId: 'e8', employeeName: 'Deepika Rao', designation: 'Frontend Developer', department: 'Engineering', ctc: 110000, basic: 55000, hra: 22000, deductions: 13200, netPay: 96800, status: 'Processed', month: 'March 2026' },
]

// ─── Performance ──────────────────────────────────────────────────────────────

export const performanceRecords: PerformanceRecord[] = [
  { id: 'perf1', employeeId: 'e1', employeeName: 'Arjun Sharma', department: 'Engineering', designation: 'Senior Software Engineer', rating: 4.5, reviewStatus: 'Completed', goalsAchieved: 8, totalGoals: 10, period: 'Q1 2026' },
  { id: 'perf2', employeeId: 'e2', employeeName: 'Priya Mehta', department: 'Engineering', designation: 'Engineering Manager', rating: 4.8, reviewStatus: 'Completed', goalsAchieved: 9, totalGoals: 10, period: 'Q1 2026' },
  { id: 'perf3', employeeId: 'e3', employeeName: 'Sneha Reddy', department: 'HR', designation: 'HR Manager', rating: 4.2, reviewStatus: 'In Progress', goalsAchieved: 6, totalGoals: 8, period: 'Q1 2026' },
  { id: 'perf4', employeeId: 'e4', employeeName: 'Amit Patel', department: 'Finance', designation: 'Finance Analyst', rating: 3.8, reviewStatus: 'Completed', goalsAchieved: 5, totalGoals: 7, period: 'Q1 2026' },
  { id: 'perf5', employeeId: 'e5', employeeName: 'Rahul Kapoor', department: 'Operations', designation: 'COO', rating: 4.9, reviewStatus: 'Completed', goalsAchieved: 10, totalGoals: 10, period: 'Q1 2026' },
  { id: 'perf6', employeeId: 'e7', employeeName: 'Vikram Singh', department: 'Sales', designation: 'Sales Manager', rating: 4.1, reviewStatus: 'Pending', goalsAchieved: 0, totalGoals: 8, period: 'Q1 2026' },
  { id: 'perf7', employeeId: 'e8', employeeName: 'Deepika Rao', department: 'Engineering', designation: 'Frontend Developer', rating: 4.3, reviewStatus: 'Completed', goalsAchieved: 7, totalGoals: 9, period: 'Q1 2026' },
  { id: 'perf8', employeeId: 'e11', employeeName: 'Rohan Joshi', department: 'Engineering', designation: 'Backend Developer', rating: 4.0, reviewStatus: 'In Progress', goalsAchieved: 4, totalGoals: 8, period: 'Q1 2026' },
]

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenants: Tenant[] = [
  { id: 't1', companyName: 'TechCorp Solutions', industry: 'Technology', plan: 'Pro', employees: 450, status: 'Active', joinedDate: '2023-01-15', mrr: 45000, contactEmail: 'admin@techcorp.com', location: 'Bangalore' },
  { id: 't2', companyName: 'Sunrise Manufacturing', industry: 'Manufacturing', plan: 'Starter', employees: 280, status: 'Active', joinedDate: '2023-04-20', mrr: 18000, contactEmail: 'hr@sunrise.com', location: 'Pune' },
  { id: 't3', companyName: 'HealthPlus Clinics', industry: 'Healthcare', plan: 'Pro', employees: 620, status: 'Active', joinedDate: '2022-11-10', mrr: 62000, contactEmail: 'ops@healthplus.com', location: 'Mumbai' },
  { id: 't4', companyName: 'EduTech Academy', industry: 'Education', plan: 'Free', employees: 45, status: 'Trial', joinedDate: '2026-03-01', mrr: 0, contactEmail: 'info@edutech.com', location: 'Delhi' },
  { id: 't5', companyName: 'RetailMax Chain', industry: 'Retail', plan: 'Enterprise', employees: 1200, status: 'Active', joinedDate: '2022-06-05', mrr: 120000, contactEmail: 'hr@retailmax.com', location: 'Hyderabad' },
  { id: 't6', companyName: 'FinServe Capital', industry: 'Finance', plan: 'Pro', employees: 380, status: 'Active', joinedDate: '2023-08-12', mrr: 38000, contactEmail: 'admin@finserve.com', location: 'Mumbai' },
  { id: 't7', companyName: 'BuildRight Infra', industry: 'Construction', plan: 'Starter', employees: 190, status: 'Suspended', joinedDate: '2023-02-28', mrr: 0, contactEmail: 'hr@buildright.com', location: 'Chennai' },
  { id: 't8', companyName: 'GreenEnergy Corp', industry: 'Energy', plan: 'Pro', employees: 340, status: 'Active', joinedDate: '2024-01-10', mrr: 34000, contactEmail: 'ops@greenenergy.com', location: 'Ahmedabad' },
  { id: 't9', companyName: 'LogiShip Freight', industry: 'Logistics', plan: 'Starter', employees: 155, status: 'Active', joinedDate: '2024-03-22', mrr: 15500, contactEmail: 'admin@logiship.com', location: 'Kolkata' },
  { id: 't10', companyName: 'FoodHub Restaurants', industry: 'Food & Beverage', plan: 'Free', employees: 32, status: 'Trial', joinedDate: '2026-04-01', mrr: 0, contactEmail: 'hr@foodhub.com', location: 'Bengaluru' },
]

// ─── Employee Self-Service Data ───────────────────────────────────────────────

export const myAttendanceLog = [
  { date: '2026-04-07', clockIn: '09:02', clockOut: '18:15', hours: 9.2, status: 'Present' as AttendanceStatus },
  { date: '2026-04-04', clockIn: '09:15', clockOut: '18:30', hours: 9.25, status: 'Present' as AttendanceStatus },
  { date: '2026-04-03', clockIn: '10:05', clockOut: '18:00', hours: 7.92, status: 'Late' as AttendanceStatus },
  { date: '2026-04-02', clockIn: '09:00', clockOut: '18:00', hours: 9.0, status: 'Present' as AttendanceStatus },
  { date: '2026-04-01', clockIn: '09:00', clockOut: '18:00', hours: 9.0, status: 'WFH' as AttendanceStatus },
  { date: '2026-03-31', clockIn: '', clockOut: '', hours: 0, status: 'Absent' as AttendanceStatus },
  { date: '2026-03-28', clockIn: '09:10', clockOut: '18:20', hours: 9.17, status: 'Present' as AttendanceStatus },
]

export const myLeaveBalance = [
  { type: 'CL' as LeaveType, label: 'Casual Leave', used: 4, total: 12 },
  { type: 'SL' as LeaveType, label: 'Sick Leave', used: 3, total: 8 },
  { type: 'PL' as LeaveType, label: 'Paid Leave', used: 6, total: 21 },
  { type: 'LOP' as LeaveType, label: 'Loss of Pay', used: 0, total: 0 },
]
