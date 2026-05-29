import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { C, badge, card, TH, TD, primaryBtn, secondaryBtn, searchInput, filterChip } from "../ui/styles";
import { Users, FileText, Search, Filter, UserCog, Bot, TerminalSquare, AlertCircle, CheckCircle2, ChevronRight, Activity, Calendar, FileDown, MoreHorizontal, Plus, Trash2, UserPlus } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { FilterBar } from "../ui/FilterBar";
import { adminService } from "@/services";
import { validatePassword, PasswordRequirements } from "@/lib/passwordPolicy";

const extractErr = (e: any, fallback: string) =>
  e?.response?.data?.message || e?.message || fallback;

type OpsMember = {
  id: string;
  name: string;
  email?: string;
  role: string;
  scope: string;
  assignedUsers: number;
  pending: number;
  avatar: string;
};

const hasOpsRole = (u: any): boolean => {
  const roles: string[] = u?.roles ?? (u?.role ? [u.role] : []);
  return roles.map((r) => String(r).toUpperCase()).includes("OPS");
};

const toOpsMember = (u: any): OpsMember => {
  const name = (u.name || u.email || u.id || "").toString();
  return {
    id: u.id,
    name,
    email: u.email,
    role: "Ops",
    scope: "Application Only",
    assignedUsers: 0,
    pending: 0,
    avatar: (name.trim()[0] || "?").toUpperCase(),
  };
};

const DUMMY_USERS = [
  { id: "U-100", name: "David Kim", plan: "Premium", ops: "Alice Chen", status: "Active", pendingReview: 2, scope: "Mentorship", lastActive: "2 hrs ago" },
  { id: "U-101", name: "Eva Wong", plan: "Starter", ops: "Brian Smith", status: "Onboarding", pendingReview: 1, scope: "Application Only", lastActive: "1 day ago" },
  { id: "U-102", name: "Frank Wright", plan: "Premium", ops: "Unassigned", status: "Idle", pendingReview: 0, scope: "Application Only", lastActive: "3 days ago" },
  { id: "U-103", name: "Grace Lee", plan: "Starter", ops: "Carla Gomez", status: "Active", pendingReview: 0, scope: "Mentorship", lastActive: "5 mins ago" },
];

const DUMMY_LOGS_OPS = [
  { id: "LO-01", time: "10:30 AM", ops: "Alice Chen", user: "David Kim", action: "Resume Review", status: "Completed" },
  { id: "LO-02", time: "09:15 AM", ops: "Brian Smith", user: "Eva Wong", action: "Initial Setup", status: "In Progress" },
];

const DUMMY_LOGS_AI = [
  { id: "LA-01", time: "11:00 AM", user: "Grace Lee", target: "Google - SWE", action: "Auto Apply", status: "Success", reviewRequired: false },
  { id: "LA-02", time: "08:45 AM", user: "David Kim", target: "Meta - PM", action: "Resume Tailor", status: "Needs Review", reviewRequired: true },
];

export function OpsManager() {
  const [role, setRole] = useState<"Ops Manager" | "Customer Support Management">("Ops Manager");
  const [activeTab, setActiveTab] = useState<"Ops Team" | "Users">("Ops Team");
  
  const [selectedOps, setSelectedOps] = useState<OpsMember | null>(null);
  const [assignUser, setAssignUser] = useState<typeof DUMMY_USERS[0] | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({ email: "", password: "", name: "" });
  const [creatingMember, setCreatingMember] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState(false);
  const [opsMembers, setOpsMembers] = useState<OpsMember[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);

  const loadAssignments = useCallback(async () => {
    try {
      const res = await adminService.listUserOpsAssignments({ includeRevoked: false });
      const items: Array<{ user_id: string; ops_user_id: string; revoked_at?: string | null }> =
        res.data?.data?.items ?? [];
      const map: Record<string, string> = {};
      for (const a of items) {
        if (!a.revoked_at) map[a.user_id] = a.ops_user_id;
      }
      setAssignments(map);
    } catch {
      setAssignments({});
    }
  }, []);

  const loadOpsMembers = useCallback(async () => {
    setOpsLoading(true);
    try {
      const res = await adminService.searchUsers({ roleType: "OPS", size: 200 });
      const items: any[] = res.data?.data?.content ?? [];
      setOpsMembers(items.filter(hasOpsRole).map(toOpsMember));
    } catch {
      setOpsMembers([]);
    } finally {
      setOpsLoading(false);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);
  useEffect(() => { loadOpsMembers(); }, [loadOpsMembers]);

  const closeAddMember = () => {
    setIsAddingMember(false);
    setNewMember({ email: "", password: "", name: "" });
  };

  const handleCreateMember = async () => {
    const email = newMember.email.trim();
    const password = newMember.password;
    const name = newMember.name.trim();

    if (!email || !password || !name) {
      toast.error("Email, password, and name are required");
      return;
    }
    if (email.length > 128) {
      toast.error("Email must be at most 128 characters");
      return;
    }
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]);
      return;
    }
    if (name.length > 512) {
      toast.error("Name must be at most 512 characters");
      return;
    }

    setCreatingMember(true);
    try {
      await adminService.opsSignup({ email, password, name });
      toast.success(`Ops account created for ${name}`);
      closeAddMember();
      await loadOpsMembers();
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to create Ops account"));
    } finally {
      setCreatingMember(false);
    }
  };

  // Determine allowed scope based on role
  const allowedScope = role === "Ops Manager" ? "Application Only + Mentorship" : "Application Only";
  const canSeeCore = role === "Ops Manager";

  // Derive per-ops assigned-user counts from the active assignments map.
  const assignedCounts: Record<string, number> = {};
  for (const opsId of Object.values(assignments)) {
    assignedCounts[opsId] = (assignedCounts[opsId] || 0) + 1;
  }
  const opsWithCounts: OpsMember[] = opsMembers.map(o => ({
    ...o,
    assignedUsers: assignedCounts[o.id] || 0,
  }));

  // Filtered data based on role
  const visibleOps = opsWithCounts.filter(o => canSeeCore ? true : o.scope === "Application Only");
  const visibleUsers = DUMMY_USERS
    .filter(u => canSeeCore ? true : u.scope === "Application Only")
    .map(u => {
      const opsId = assignments[u.id];
      if (!opsId) return u;
      const ops = opsWithCounts.find(o => o.id === opsId);
      return { ...u, ops: ops?.name ?? opsId };
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bgPage }}>
      {/* Header Area */}
      <div style={{ padding: "10px 32px 0 32px", background: C.bgWhite, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            
            
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 24 }}>
          {["Ops Team", "Users"].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  padding: "0 0 12px 0",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? C.blue : C.textSub,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? C.blue : "transparent"}`,
                  borderColor: isActive ? C.blue : "transparent",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "color 120ms ease, border-color 120ms ease"
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        {activeTab === "Ops Team" && <OpsTeamTab ops={visibleOps} onViewOps={(o) => setSelectedOps(o)} onAddMember={() => setIsAddingMember(true)} />}
        {activeTab === "Users" && <UsersTab canSeeCore={canSeeCore} users={visibleUsers} onAssignUser={(u) => setAssignUser(u)} />}
      </div>

      {/* Drawers */}
      <Drawer open={!!selectedOps} onClose={() => setSelectedOps(null)} title={selectedOps?.name || "Ops Details"} width={400}>
        {selectedOps && (
          <div style={{ padding: "0 24px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.blueBg, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600 }}>
                {selectedOps.avatar}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{selectedOps.name}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{selectedOps.role} • {selectedOps.scope}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              <div style={{ ...card, padding: 16 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Assigned Users</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{selectedOps.assignedUsers}</div>
              </div>
              
            </div>
            
            
          </div>
        )}
      </Drawer>

      <Drawer open={!!assignUser} onClose={() => setAssignUser(null)} title={`Assign ${assignUser?.name}`} width={360}>
        {assignUser && (
          <div style={{ padding: "0 24px 24px" }}>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
              Select an Ops member to manage <strong>{assignUser.name}</strong>.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleOps.map(o => (
                <button
                  key={o.id}
                  disabled={assigning}
                  onClick={async () => {
                    setAssigning(true);
                    try {
                      await adminService.assignUserToOps({ user_id: assignUser.id, ops_user_id: o.id });
                      toast.success(`${assignUser.name} assigned to ${o.name}`);
                      setAssignUser(null);
                      await loadAssignments();
                    } catch (e: any) {
                      toast.error(extractErr(e, "Failed to assign"));
                    } finally {
                      setAssigning(false);
                    }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: 8,
                    cursor: "pointer", textAlign: "left"
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.blueBg, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
                    {o.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{o.assignedUsers} assigned users</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={isAddingMember} onClose={closeAddMember} title="Add Ops Member" width={400}>
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              value={newMember.name}
              onChange={(e) => setNewMember(m => ({ ...m, name: e.target.value }))}
              style={{ ...searchInput, width: "100%", height: 36, paddingLeft: 12 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Email</label>
            <input
              type="email"
              placeholder="jane@screna.ai"
              value={newMember.email}
              onChange={(e) => setNewMember(m => ({ ...m, email: e.target.value }))}
              style={{ ...searchInput, width: "100%", height: 36, paddingLeft: 12 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Password</label>
            <input
              type="password"
              value={newMember.password}
              onChange={(e) => setNewMember(m => ({ ...m, password: e.target.value }))}
              style={{ ...searchInput, width: "100%", height: 36, paddingLeft: 12 }}
            />
            {newMember.password.length > 0 && (
              <PasswordRequirements password={newMember.password} />
            )}
          </div>
          {/* Role & Permission and Assigned Scope are not yet supported by the backend.
              Re-enable when opsSignup accepts role / scope fields.
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Role & Permission</label>
            <select style={{ ...searchInput, width: "100%", height: 36, paddingLeft: 12, appearance: "auto" }}>
              <option value="Customer Support">Customer Support</option>
              {canSeeCore && <option value="Ops Manager">Ops Manager</option>}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Assigned Scope</label>
            <select style={{ ...searchInput, width: "100%", height: 36, paddingLeft: 12, appearance: "auto" }}>
              <option value="Application Only">Application Only</option>
              {canSeeCore && <option value="Application Only + Mentorship">Application Only + Mentorship</option>}
            </select>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
              This determines which user accounts this member can access and manage.
            </div>
          </div>
          */}
          <div style={{ marginTop: 12, display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={closeAddMember} style={{ ...secondaryBtn, height: 36, padding: "0 16px" }}>Cancel</button>
            <button
              onClick={handleCreateMember}
              disabled={creatingMember || validatePassword(newMember.password).length > 0 || !newMember.email.trim() || !newMember.name.trim()}
              style={{
                ...primaryBtn,
                height: 36,
                padding: "0 16px",
                opacity: (creatingMember || validatePassword(newMember.password).length > 0 || !newMember.email.trim() || !newMember.name.trim()) ? 0.6 : 1,
                cursor: creatingMember ? "not-allowed" : "pointer",
              }}
            >
              {creatingMember ? "Creating..." : "Create Member"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function OverviewTab({ canSeeCore, users, ops, onAssignUser }: { canSeeCore: boolean, users: typeof DUMMY_USERS, ops: OpsMember[], onAssignUser: (u: any) => void }) {
  const pendingCount = users.reduce((acc, u) => acc + u.pendingReview, 0);
  const unassigned = users.filter(u => u.ops === "Unassigned").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SummaryCard title="Total Managed Users" value={users.length} trend="+12 this week" />
        <SummaryCard title="Active Ops Team" value={ops.length} trend="Stable" />
        <SummaryCard title="Unassigned Users" value={unassigned} variant={unassigned > 0 ? "warning" : "default"} />
        <SummaryCard title="Pending Reviews" value={pendingCount} variant={pendingCount > 10 ? "danger" : "default"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>Ops Distribution</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH}>Ops Member</th>
                  <th style={TH}>Assigned Users</th>
                </tr>
              </thead>
              <tbody>
                {ops.map(o => (
                  <tr key={o.id}>
                    <td style={{ ...TD, display: "flex", alignItems: "center", gap: 8, height: "auto", padding: "10px 14px" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.blueBg, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                        {o.avatar}
                      </div>
                      <span style={{ fontWeight: 500 }}>{o.name}</span>
                    </td>
                    <td style={TD}>{o.assignedUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>Needs Attention</h3>
            {unassigned > 0 ? (
              <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.amber, fontWeight: 600, marginBottom: 4 }}>
                  <AlertCircle size={16} />
                  {unassigned} Unassigned Users
                </div>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 12 }}>Users are waiting to be matched with an Ops owner.</div>
                <button onClick={() => onAssignUser(users.find(u => u.ops === "Unassigned"))} style={{ ...primaryBtn, background: C.amber, borderColor: C.amber, height: 28, fontSize: 12 }}>Assign now</button>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                No unassigned users.
              </div>
            )}
            
            {pendingCount > 0 && (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Pending Reviews</span>
                  <span style={{ ...badge("amber") }}>{pendingCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, trend, variant = "default" }: { title: string, value: string | number, trend?: string, variant?: "default" | "warning" | "danger" }) {
  const valColor = variant === "danger" ? C.red : variant === "warning" ? C.amber : C.text;
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: valColor, marginBottom: 4, letterSpacing: "-0.02em" }}>{value}</div>
      {trend && <div style={{ fontSize: 12, color: C.textSub }}>{trend}</div>}
    </div>
  );
}

function OpsTeamTab({ ops, onViewOps, onAddMember }: { ops: OpsMember[], onViewOps: (o: OpsMember) => void, onAddMember: () => void }) {
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opsList, setOpsList] = useState<OpsMember[]>(ops);

  useEffect(() => { setOpsList(ops); }, [ops]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === opsList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(opsList.map(o => o.id)));
    }
  };

  const handleDelete = () => {
    setOpsList(prev => prev.filter(o => !selected.has(o.id)));
    setSelected(new Set());
    setManaging(false);
  };

  const handleCancelManage = () => {
    setManaging(false);
    setSelected(new Set());
  };

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Ops Team Members</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {managing ? (
            <>
              {selected.size > 0 && (
                <button onClick={handleDelete} style={{ ...primaryBtn, height: 34, fontSize: 13, background: "#D9363E", gap: 6 }}>
                  <Trash2 size={14} /> Delete {selected.size} member{selected.size > 1 ? "s" : ""}
                </button>
              )}
              <button onClick={handleCancelManage} style={{ ...secondaryBtn, height: 34, fontSize: 13 }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setManaging(true)} style={{ ...secondaryBtn, height: 34, fontSize: 13 }}>Manage Members</button>
              <button onClick={onAddMember} style={{ ...primaryBtn, height: 34, fontSize: 13, gap: 6 }}><UserPlus size={14} /> Add Member</button>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {managing && (
                <th style={{ ...TH, width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" checked={selected.size === opsList.length && opsList.length > 0} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
              )}
              <th style={TH}>Member</th>
              <th style={TH}>Scope</th>
              <th style={TH}>Assigned</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {opsList.map(o => (
              <tr key={o.id} onClick={managing ? () => toggleSelect(o.id) : undefined} style={{ cursor: managing ? "pointer" : "default", background: selected.has(o.id) ? C.blueBg : undefined }}>
                {managing && (
                  <td style={{ ...TD, width: 40, paddingLeft: 16, paddingTop: 20, paddingBottom: 20 }}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }} />
                  </td>
                )}
                <td style={{ ...TD, paddingTop: 20, paddingBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.text }}>{o.name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{o.role}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...TD, paddingTop: 20, paddingBottom: 20 }}><span style={badge(o.scope.includes("Mentorship") ? "purple" : "gray")}>{o.scope}</span></td>
                <td style={{ ...TD, paddingTop: 20, paddingBottom: 20 }}>{o.assignedUsers} users</td>
                <td style={{ ...TD, textAlign: "right", paddingTop: 20, paddingBottom: 20 }}>
                  {!managing && <button onClick={() => onViewOps(o)} style={{ ...secondaryBtn, height: 28, fontSize: 12 }}>View details</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ canSeeCore, users, onAssignUser }: { canSeeCore: boolean, users: typeof DUMMY_USERS, onAssignUser: (u: any) => void }) {
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [userList, setUserList] = useState(users);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPlan, setFilterPlan] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterOps, setFilterOps] = useState("All");

  const uniqueOps = Array.from(new Set(userList.map(u => u.ops)));
  const activeFilterCount = [filterPlan, filterStatus, filterOps].filter(v => v !== "All").length;

  const visibleUsers = userList.filter(u => {
    if (filterPlan !== "All" && u.plan !== filterPlan) return false;
    if (filterStatus !== "All") {
      const normalized = u.status === "Active" ? "Active" : "Idle";
      if (normalized !== filterStatus) return false;
    }
    if (filterOps !== "All" && u.ops !== filterOps) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === visibleUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleUsers.map(u => u.id)));
    }
  };

  const handleDelete = () => {
    setUserList(prev => prev.filter(u => !selected.has(u.id)));
    setSelected(new Set());
    setManaging(false);
  };

  const handleCancelManage = () => {
    setManaging(false);
    setSelected(new Set());
  };

  const filterSection = (label: string, options: string[], value: string, onChange: (v: string) => void) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["All", ...options].map(opt => (
          <button key={opt} onClick={() => onChange(opt)} style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${value === opt ? C.blue : C.border}`, background: value === opt ? C.blueBg : "#fff", color: value === opt ? C.blue : C.textMuted, fontFamily: "'Inter', sans-serif" }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ position: "relative", width: 260 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 9, color: C.textMuted }} />
          <input placeholder="Search users..." style={{ ...searchInput, paddingLeft: 36, width: "100%", height: 34 }} />
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setFilterOpen(o => !o)} style={{ ...secondaryBtn, height: 34, border: activeFilterCount > 0 ? `1px solid ${C.blue}` : undefined, color: activeFilterCount > 0 ? C.blue : undefined }}>
            <Filter size={16} style={{ marginRight: 6 }} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          {filterOpen && (
            <div style={{ position: "absolute", top: 40, left: 0, zIndex: 100, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 24px hsl(222 22% 15% / 0.10)", padding: 16, width: 260 }}>
              {filterSection("Plan & Scope", ["Premium", "Starter"], filterPlan, setFilterPlan)}
              {filterSection("Status", ["Active", "Idle"], filterStatus, setFilterStatus)}
              {filterSection("Assigned Ops", uniqueOps, filterOps, setFilterOps)}
              {activeFilterCount > 0 && (
                <button onClick={() => { setFilterPlan("All"); setFilterStatus("All"); setFilterOps("All"); }} style={{ fontSize: 12, color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {managing ? (
          <>
            {selected.size > 0 && (
              <button onClick={handleDelete} style={{ ...primaryBtn, height: 34, background: "#D9363E", fontSize: 13, gap: 6 }}>
                <Trash2 size={14} /> Delete {selected.size} user{selected.size > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={handleCancelManage} style={{ ...secondaryBtn, height: 34, fontSize: 13 }}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setManaging(true)} style={{ ...secondaryBtn, height: 34, fontSize: 13 }}>Manage Users</button>
            
          </>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto" }} onClick={() => filterOpen && setFilterOpen(false)}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {managing && (
                <th style={{ ...TH, width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" checked={selected.size === visibleUsers.length && visibleUsers.length > 0} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
              )}
              <th style={TH}>User</th>
              <th style={TH}>Plan & Scope</th>
              <th style={TH}>Assigned Ops</th>
              <th style={TH}>Status</th>
              <th style={TH}>Last Active</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map(u => (
              <tr key={u.id} onClick={managing ? () => toggleSelect(u.id) : undefined} style={{ cursor: managing ? "pointer" : "default", background: selected.has(u.id) ? C.blueBg : undefined }}>
                {managing && (
                  <td style={{ ...TD, width: 40, paddingLeft: 16 }}>
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }} />
                  </td>
                )}
                <td style={{ ...TD, fontWeight: 500 }}>{u.name}</td>
                <td style={TD}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={badge(u.plan === "Premium" ? "purple" : "gray")}>{u.plan}</span>
                  </div>
                </td>
                <td style={TD}>
                  {u.ops === "Unassigned" ? (
                    <span style={badge("amber")}>Unassigned</span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{u.ops}</span>
                    </div>
                  )}
                </td>
                <td style={TD}>
                  <span style={badge(u.status === "Active" ? "green" : "gray")}>{u.status === "Active" ? "Active" : "Idle"}</span>
                </td>
                <td style={{ ...TD, color: C.textMuted }}>{u.lastActive}</td>
                <td style={{ ...TD, textAlign: "right" }}>
                  {!managing && canSeeCore && (
                    u.ops === "Unassigned" ? (
                      <button onClick={() => onAssignUser(u)} style={{ ...primaryBtn, height: 28, fontSize: 12, padding: "0 12px", width: 82, justifyContent: "center" }}>Assign</button>
                    ) : (
                      <button onClick={() => onAssignUser(u)} style={{ background: "#fff", border: `1px solid ${C.blue}`, color: C.blue, cursor: "pointer", height: 28, fontSize: 12, padding: "0 12px", borderRadius: 7, fontWeight: 600, width: 82, justifyContent: "center", display: "inline-flex", alignItems: "center", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>Reassign</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogsTab({ canSeeCore }: { canSeeCore: boolean }) {
  const [subTab, setSubTab] = useState<"Ops Activity" | "AI Application">("Ops Activity");
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", padding: "0 16px", borderBottom: `1px solid ${C.border}`, gap: 24 }}>
        {["Ops Activity", "AI Application"].map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t as any)}
            style={{
              padding: "16px 0",
              fontSize: 13,
              fontWeight: subTab === t ? 600 : 500,
              color: subTab === t ? C.blue : C.textSub,
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${subTab === t ? C.blue : "transparent"}`,
              cursor: "pointer"
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          {subTab === "Ops Activity" ? (
            <>
              <thead>
                <tr>
                  <th style={TH}>Time</th>
                  <th style={TH}>Ops Name</th>
                  <th style={TH}>User</th>
                  <th style={TH}>Action</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_LOGS_OPS.map(l => (
                  <tr key={l.id}>
                    <td style={{ ...TD, color: C.textMuted, fontSize: 12 }}>{l.time}</td>
                    <td style={{ ...TD, fontWeight: 500 }}>{l.ops}</td>
                    <td style={TD}>{l.user}</td>
                    <td style={TD}>{l.action}</td>
                    <td style={TD}><span style={badge(l.status === "Completed" ? "green" : "blue")}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr>
                  <th style={TH}>Time</th>
                  <th style={TH}>User</th>
                  <th style={TH}>Target</th>
                  <th style={TH}>Action</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_LOGS_AI.map(l => (
                  <tr key={l.id}>
                    <td style={{ ...TD, color: C.textMuted, fontSize: 12 }}>{l.time}</td>
                    <td style={{ ...TD, fontWeight: 500 }}>{l.user}</td>
                    <td style={TD}>{l.target}</td>
                    <td style={TD}>{l.action}</td>
                    <td style={TD}>
                      <span style={badge(l.status === "Success" ? "green" : "amber")}>{l.status}</span>
                      {l.reviewRequired && <span style={{ marginLeft: 8, fontSize: 11, color: C.amber, fontWeight: 500 }}>Review Required</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  );
}
