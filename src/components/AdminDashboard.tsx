"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Bed,
  ListFilter,
  Search,
  Plus,
  Download,
  Settings as SettingsIcon,
  LogOut,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";

type Participant = {
  id: string;
  name: string;
  ic: string | null;
  icNormalized: string | null;
  size: string;
  roomId: string | null;
  teamId: string | null;
  remarks: string | null;
  room?: { id: string; name: string; capacity: number } | null;
  team?: { id: string; name: string; color: string; capacity: number } | null;
};

type Room = {
  id: string;
  name: string;
  capacity: number;
  participants: { id: string; name: string; size: string }[];
  _count: { participants: number };
};

type Team = {
  id: string;
  name: string;
  color: string;
  capacity: number;
  participants: { id: string; name: string; size: string }[];
  _count: { participants: number };
};

type ShirtSize = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

type Stats = {
  totalParticipants: number;
  roomAssignedCount: number;
  roomPendingCount: number;
  roomAllocationPercent: number;
  teamAssignedCount: number;
  teamPendingCount: number;
  teamAllocationPercent: number;
  sizes: { name: string; color: string; count: number }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"directory" | "rooms" | "teams" | "settings">("directory");

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sizes, setSizes] = useState<ShirtSize[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Modals
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [participantForm, setParticipantForm] = useState({
    name: "",
    ic: "",
    size: "L",
    roomId: "",
    teamId: "",
    remarks: "",
  });

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({ name: "", capacity: 4 });

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", color: "#3b82f6", capacity: 7 });

  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ShirtSize | null>(null);
  const [sizeForm, setSizeForm] = useState({ name: "", color: "#3b82f6", sortOrder: 1 });

  // Delete confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "participant" | "room" | "team" | "size";
    id: string;
    name: string;
  } | null>(null);

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      const [resStats, resParts, resRooms, resTeams, resSizes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/participants"),
        fetch("/api/admin/rooms"),
        fetch("/api/admin/teams"),
        fetch("/api/admin/sizes"),
      ]);

      if (resStats.status === 401 || resParts.status === 401) {
        router.push("/urusetia/login");
        return;
      }

      const [dataStats, dataParts, dataRooms, dataTeams, dataSizes] = await Promise.all([
        resStats.json(),
        resParts.json(),
        resRooms.json(),
        resTeams.json(),
        resSizes.json(),
      ]);

      setStats(dataStats);
      setParticipants(Array.isArray(dataParts) ? dataParts : []);
      setRooms(Array.isArray(dataRooms) ? dataRooms : []);
      setTeams(Array.isArray(dataTeams) ? dataTeams : []);
      setSizes(Array.isArray(dataSizes) ? dataSizes : []);
    } catch (err) {
      console.error("Load data error:", err);
      showToast("error", "Gagal memuat data dari pelayan.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/urusetia/login");
      router.refresh();
    } catch {
      router.push("/urusetia/login");
    }
  };

  // Quick allocation directly from dropdown
  const handleQuickAllocate = async (
    participantId: string,
    field: "roomId" | "teamId",
    value: string
  ) => {
    const targetVal = value === "" ? null : value;
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/allocate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: targetVal }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Alamak, agihan gagal disimpan.");
        return;
      }

      showToast("success", "Agihan berjaya dikemas kini!");
      await loadData();
    } catch {
      showToast("error", "Ralat sambungan ketika membuat agihan.");
    }
  };

  // Participant Form Submit (Create / Edit)
  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingParticipant
        ? `/api/admin/participants/${editingParticipant.id}`
        : "/api/admin/participants";
      const method = editingParticipant ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: participantForm.name,
          ic: participantForm.ic,
          size: participantForm.size,
          roomId: participantForm.roomId || null,
          teamId: participantForm.teamId || null,
          remarks: participantForm.remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Gagal menyimpan peserta.");
        return;
      }

      showToast(
        "success",
        editingParticipant
          ? "Maklumat peserta berjaya dikemas kini."
          : "Peserta baru berjaya didaftarkan."
      );
      setParticipantModalOpen(false);
      setEditingParticipant(null);
      await loadData();
    } catch {
      showToast("error", "Ralat sambungan.");
    }
  };

  // Room Form Submit
  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRoom ? `/api/admin/rooms/${editingRoom.id}` : "/api/admin/rooms";
      const method = editingRoom ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Gagal menyimpan bilik.");
        return;
      }

      showToast(
        "success",
        editingRoom ? "Bilik berjaya dikemas kini." : "Bilik baru berjaya ditambah."
      );
      setRoomModalOpen(false);
      setEditingRoom(null);
      await loadData();
    } catch {
      showToast("error", "Ralat sambungan.");
    }
  };

  // Team Form Submit
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTeam ? `/api/admin/teams/${editingTeam.id}` : "/api/admin/teams";
      const method = editingTeam ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Gagal menyimpan kumpulan.");
        return;
      }

      showToast(
        "success",
        editingTeam ? "Kumpulan berjaya dikemas kini." : "Kumpulan baru berjaya ditambah."
      );
      setTeamModalOpen(false);
      setEditingTeam(null);
      await loadData();
    } catch {
      showToast("error", "Ralat sambungan.");
    }
  };

  // Shirt Size Submit
  const handleSizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSize ? `/api/admin/sizes/${editingSize.id}` : "/api/admin/sizes";
      const method = editingSize ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sizeForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Gagal menyimpan saiz baju.");
        return;
      }

      showToast("success", "Tetapan saiz baju berjaya dikemas kini.");
      setSizeModalOpen(false);
      setEditingSize(null);
      await loadData();
    } catch {
      showToast("error", "Ralat sambungan.");
    }
  };

  // Confirm delete execution
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;

    try {
      let url = "";
      if (type === "participant") url = `/api/admin/participants/${id}`;
      else if (type === "room") url = `/api/admin/rooms/${id}`;
      else if (type === "team") url = `/api/admin/teams/${id}`;
      else if (type === "size") url = `/api/admin/sizes/${id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Gagal memadam.");
        return;
      }

      showToast("success", data.message || "Berjaya dipadam.");
      setDeleteConfirm(null);
      await loadData();
    } catch {
      showToast("error", "Ralat sambungan ketika memadam.");
    }
  };

  // Filtered Participants List
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
        const nameMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const rawIcMatch = p.ic ? p.ic.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const normIcMatch = p.icNormalized
          ? p.icNormalized.toLowerCase().includes(query)
          : false;
        if (!nameMatch && !rawIcMatch && !normIcMatch) return false;
      }

      // Size
      if (sizeFilter !== "ALL" && p.size !== sizeFilter) {
        return false;
      }

      // Room status
      if (roomFilter === "assigned" && !p.roomId) return false;
      if (roomFilter === "unassigned" && p.roomId) return false;

      // Team status
      if (teamFilter === "assigned" && !p.teamId) return false;
      if (teamFilter === "unassigned" && p.teamId) return false;

      return true;
    });
  }, [participants, searchQuery, sizeFilter, roomFilter, teamFilter]);

  // Color map for size badges
  const sizeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    sizes.forEach((s) => map.set(s.name, s.color));
    return map;
  }, [sizes]);

  const getSizeBadgeColor = (sizeName: string) => {
    return sizeColorMap.get(sizeName) || "#4b5563";
  };

  // Format IC display
  const formatDisplayIC = (p: Participant) => {
    const raw = p.ic || p.icNormalized;
    if (!raw) return "-";
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleaned.length === 12 && /^\d+$/.test(cleaned)) {
      return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 12)}`;
    }
    return p.ic || "-";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-xl transition-all animate-in fade-in slide-in-from-top-4 max-w-md">
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-semibold text-slate-800">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STICKY HEADER & TABS BAR */}
      <header className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-wider text-blue-600 uppercase">
                  EVENT LOGISTICS
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  Urusetia
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5">
                Room & Team Allocation
              </h1>
            </div>

            {/* Navigation Tabs Pill (min-h-[44px] tap targets) */}
            <div className="flex flex-wrap items-center gap-2">
              <nav aria-label="Tab navigasi urusetia" className="inline-flex rounded-2xl bg-white p-1 border border-slate-200/90 shadow-xs">
                <button
                  onClick={() => setActiveTab("rooms")}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold min-h-[44px] transition-all ${
                    activeTab === "rooms"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Bed className="h-4 w-4" />
                  <span>Rooms</span>
                </button>

                <button
                  onClick={() => setActiveTab("teams")}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold min-h-[44px] transition-all ${
                    activeTab === "teams"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Teams</span>
                </button>

                <button
                  onClick={() => setActiveTab("directory")}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold min-h-[44px] transition-all ${
                    activeTab === "directory"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <ListFilter className="h-4 w-4" />
                  <span>Directory</span>
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  title="Tetapan Saiz Baju & Sistem"
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold min-h-[44px] transition-all ${
                    activeTab === "settings"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              </nav>

              {/* Quick Public Preview & Logout */}
              <div className="flex items-center gap-1.5 pl-1">
                <Link
                  href="/"
                  target="_blank"
                  title="Lihat Halaman Semakan Awam (Buka tab baru)"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-xs transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log Keluar Urusetia"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 shadow-xs transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-5">
        {/* TOP SUMMARY CARD (Kad Ringkasan) */}
        {stats && (
          <div className="mb-6 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Total Participants */}
              <div className="flex items-center gap-4 shrink-0 lg:pr-8 lg:border-r border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Participants
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {stats.totalParticipants}
                  </span>
                </div>
              </div>

              {/* Progress Bars (Room & Team Allocation) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* Room Allocation */}
                <div className="rounded-2xl bg-slate-50/70 p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Room allocation</span>
                    <span className="text-slate-900 font-extrabold">
                      {stats.roomAllocationPercent}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${stats.roomAllocationPercent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">
                      {stats.roomAssignedCount} assigned
                    </span>{" "}
                    · {stats.roomPendingCount} pending
                  </div>
                </div>

                {/* Team Allocation */}
                <div className="rounded-2xl bg-slate-50/70 p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Team allocation</span>
                    <span className="text-slate-900 font-extrabold">
                      {stats.teamAllocationPercent}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${stats.teamAllocationPercent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">
                      {stats.teamAssignedCount} assigned
                    </span>{" "}
                    · {stats.teamPendingCount} pending
                  </div>
                </div>
              </div>

              {/* Shirt Size Badges Row */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 lg:pl-6 lg:border-l border-slate-100">
                {stats.sizes.map((s) => (
                  <div
                    key={s.name}
                    className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 text-xs font-bold shadow-xs bg-slate-50 min-h-[36px]"
                  >
                    <span
                      className="px-2.5 py-1.5 text-white font-extrabold text-[11px]"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name}
                    </span>
                    <span className="px-2.5 py-1.5 text-slate-700 bg-white font-mono">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: DIRECTORY */}
        {activeTab === "directory" && (
          <div>
            {/* Filter & Action Toolbar (wraps neatly, min-h-[44px] targets) */}
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau nombor IC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[44px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Kosongkan carian"
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 h-8 w-8 flex items-center justify-center rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters & Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Size Filter */}
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  aria-label="Filter saiz baju"
                  className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[44px]"
                >
                  <option value="ALL">All sizes</option>
                  {sizes.map((s) => (
                    <option key={s.id} value={s.name}>
                      Size {s.name}
                    </option>
                  ))}
                </select>

                {/* Room Status Filter */}
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  aria-label="Filter status bilik"
                  className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[44px]"
                >
                  <option value="ALL">Any room status</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Pending (Belum)</option>
                </select>

                {/* Team Status Filter */}
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  aria-label="Filter status team"
                  className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[44px]"
                >
                  <option value="ALL">Any team status</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Pending (Belum)</option>
                </select>

                {/* Export CSV Button */}
                <a
                  href="/api/admin/export"
                  download
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[44px]"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </a>

                {/* Add Participant Button */}
                <button
                  onClick={() => {
                    setEditingParticipant(null);
                    setParticipantForm({
                      name: "",
                      ic: "",
                      size: sizes[0]?.name || "L",
                      roomId: "",
                      teamId: "",
                      remarks: "",
                    });
                    setParticipantModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all min-h-[44px]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Peserta</span>
                </button>
              </div>
            </div>

            {/* DIRECTORY TABLE (DESKTOP & IPAD LANDSCAPE >= 1024px / 1180px) */}
            {/* Muat kemas tanpa horizontal scroll */}
            <div className="hidden lg:block rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5 w-[28%]">Participant</th>
                    <th className="py-3.5 px-3 text-center w-[10%]">Size</th>
                    <th className="py-3.5 px-3 w-[22%]">Room</th>
                    <th className="py-3.5 px-3 w-[22%]">Team</th>
                    <th className="py-3.5 px-3 w-[10%]">Remarks</th>
                    <th className="py-3.5 px-4 text-right w-[8%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {loading
                          ? "Memuat senarai peserta..."
                          : "Tiada peserta yang sepadan dengan carian / filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => {
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* Participant Name & IC */}
                          <td className="py-3.5 px-5 truncate">
                            <div className="font-bold text-slate-900 truncate">
                              {p.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono tracking-wide mt-0.5">
                              {formatDisplayIC(p)}
                            </div>
                          </td>

                          {/* Size */}
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className="inline-block rounded-lg px-2.5 py-1 text-xs font-extrabold text-white shadow-xs"
                              style={{ backgroundColor: getSizeBadgeColor(p.size) }}
                            >
                              {p.size}
                            </span>
                          </td>

                          {/* Room Dropdown (Quick Allocation - min-h-[44px]) */}
                          <td className="py-3.5 px-3">
                            <select
                              value={p.roomId || ""}
                              onChange={(e) =>
                                handleQuickAllocate(p.id, "roomId", e.target.value)
                              }
                              aria-label={`Pilih bilik untuk ${p.name}`}
                              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
                            >
                              <option value="">Room (Belum)</option>
                              {rooms.map((r) => {
                                const isCurrent = p.roomId === r.id;
                                const isFull = r._count.participants >= r.capacity;
                                return (
                                  <option
                                    key={r.id}
                                    value={r.id}
                                    disabled={isFull && !isCurrent}
                                  >
                                    {r.name} ({r._count.participants}/{r.capacity})
                                    {isFull && !isCurrent ? " - Penuh" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>

                          {/* Team Dropdown (Quick Allocation - min-h-[44px]) */}
                          <td className="py-3.5 px-3">
                            <select
                              value={p.teamId || ""}
                              onChange={(e) =>
                                handleQuickAllocate(p.id, "teamId", e.target.value)
                              }
                              aria-label={`Pilih kumpulan untuk ${p.name}`}
                              className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
                            >
                              <option value="">Team (Belum)</option>
                              {teams.map((t) => {
                                const isCurrent = p.teamId === t.id;
                                const isFull = t._count.participants >= t.capacity;
                                return (
                                  <option
                                    key={t.id}
                                    value={t.id}
                                    disabled={isFull && !isCurrent}
                                  >
                                    {t.name} ({t._count.participants}/{t.capacity})
                                    {isFull && !isCurrent ? " - Penuh" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>

                          {/* Remarks */}
                          <td className="py-3.5 px-3 text-xs text-slate-500 truncate" title={p.remarks || ""}>
                            {p.remarks || "-"}
                          </td>

                          {/* Actions (min-h-[44px] touch target) */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingParticipant(p);
                                  setParticipantForm({
                                    name: p.name,
                                    ic: p.ic || "",
                                    size: p.size,
                                    roomId: p.roomId || "",
                                    teamId: p.teamId || "",
                                    remarks: p.remarks || "",
                                  });
                                  setParticipantModalOpen(true);
                                }}
                                title="Edit Peserta"
                                aria-label={`Edit ${p.name}`}
                                className="h-10 w-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: "participant",
                                    id: p.id,
                                    name: p.name,
                                  })
                                }
                                title="Padam Peserta"
                                aria-label={`Padam ${p.name}`}
                                className="h-10 w-10 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* DIRECTORY 2-COLUMN CARDS (IPAD PORTRAIT 768px – 1023px) */}
            <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-3.5">
              {filteredParticipants.length === 0 ? (
                <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                  {loading
                    ? "Memuat senarai peserta..."
                    : "Tiada peserta yang sepadan dengan carian."}
                </div>
              ) : (
                filteredParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <h2 className="font-bold text-slate-900 text-sm leading-snug">
                            {p.name}
                          </h2>
                          <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                            {formatDisplayIC(p)}
                          </span>
                        </div>
                        <span
                          className="rounded-lg px-2.5 py-1 text-xs font-extrabold text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: getSizeBadgeColor(p.size) }}
                        >
                          {p.size}
                        </span>
                      </div>

                      <div className="space-y-2.5 my-3">
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                            Bilik Penginapan
                          </label>
                          <select
                            value={p.roomId || ""}
                            onChange={(e) =>
                              handleQuickAllocate(p.id, "roomId", e.target.value)
                            }
                            aria-label={`Pilih bilik tablet untuk ${p.name}`}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 shadow-xs min-h-[44px]"
                          >
                            <option value="">Room (Belum Ditetapkan)</option>
                            {rooms.map((r) => {
                              const isCurrent = p.roomId === r.id;
                              const isFull = r._count.participants >= r.capacity;
                              return (
                                <option
                                  key={r.id}
                                  value={r.id}
                                  disabled={isFull && !isCurrent}
                                >
                                  {r.name} ({r._count.participants}/{r.capacity})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                            Kumpulan (Team)
                          </label>
                          <select
                            value={p.teamId || ""}
                            onChange={(e) =>
                              handleQuickAllocate(p.id, "teamId", e.target.value)
                            }
                            aria-label={`Pilih kumpulan tablet untuk ${p.name}`}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 shadow-xs min-h-[44px]"
                          >
                            <option value="">Team (Belum Ditetapkan)</option>
                            {teams.map((t) => {
                              const isCurrent = p.teamId === t.id;
                              const isFull = t._count.participants >= t.capacity;
                              return (
                                <option
                                  key={t.id}
                                  value={t.id}
                                  disabled={isFull && !isCurrent}
                                >
                                  {t.name} ({t._count.participants}/{t.capacity})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {p.remarks && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3">
                          <span className="font-bold text-slate-700">Catatan: </span>
                          {p.remarks}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingParticipant(p);
                          setParticipantForm({
                            name: p.name,
                            ic: p.ic || "",
                            size: p.size,
                            roomId: p.roomId || "",
                            teamId: p.teamId || "",
                            remarks: p.remarks || "",
                          });
                          setParticipantModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 min-h-[44px]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "participant",
                            id: p.id,
                            name: p.name,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 min-h-[44px]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Padam</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DIRECTORY CARDS (MOBILE PHONE < 768px / 360–390px) */}
            <div className="block md:hidden space-y-3">
              {filteredParticipants.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                  {loading
                    ? "Memuat senarai peserta..."
                    : "Tiada peserta yang sepadan dengan carian."}
                </div>
              ) : (
                filteredParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="font-bold text-slate-900 text-sm leading-snug">
                          {p.name}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                          {formatDisplayIC(p)}
                        </span>
                      </div>
                      <span
                        className="rounded-lg px-2.5 py-1 text-xs font-extrabold text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: getSizeBadgeColor(p.size) }}
                      >
                        {p.size}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          Bilik Penginapan
                        </label>
                        <select
                          value={p.roomId || ""}
                          onChange={(e) =>
                            handleQuickAllocate(p.id, "roomId", e.target.value)
                          }
                          aria-label={`Pilih bilik mobile untuk ${p.name}`}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 shadow-xs min-h-[44px]"
                        >
                          <option value="">Belum Ada Bilik</option>
                          {rooms.map((r) => {
                            const isCurrent = p.roomId === r.id;
                            const isFull = r._count.participants >= r.capacity;
                            return (
                              <option
                                key={r.id}
                                value={r.id}
                                disabled={isFull && !isCurrent}
                              >
                                {r.name} ({r._count.participants}/{r.capacity})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          Kumpulan (Team)
                        </label>
                        <select
                          value={p.teamId || ""}
                          onChange={(e) =>
                            handleQuickAllocate(p.id, "teamId", e.target.value)
                          }
                          aria-label={`Pilih kumpulan mobile untuk ${p.name}`}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 shadow-xs min-h-[44px]"
                        >
                          <option value="">Belum Ada Team</option>
                          {teams.map((t) => {
                            const isCurrent = p.teamId === t.id;
                            const isFull = t._count.participants >= t.capacity;
                            return (
                              <option
                                key={t.id}
                                value={t.id}
                                disabled={isFull && !isCurrent}
                              >
                                {t.name} ({t._count.participants}/{t.capacity})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {p.remarks && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3">
                        <span className="font-bold text-slate-700">Catatan: </span>
                        {p.remarks}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingParticipant(p);
                          setParticipantForm({
                            name: p.name,
                            ic: p.ic || "",
                            size: p.size,
                            roomId: p.roomId || "",
                            teamId: p.teamId || "",
                            remarks: p.remarks || "",
                          });
                          setParticipantModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 min-h-[44px]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "participant",
                            id: p.id,
                            name: p.name,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 min-h-[44px]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Padam</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS (2-3 Kolum pada Tablet & Desktop) */}
        {activeTab === "rooms" && (
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Pengurusan Bilik</h2>
                <p className="text-xs text-slate-500">
                  Urus kuota dan lihat senarai penghuni bilik penginapan peserta.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRoom(null);
                  setRoomForm({ name: "", capacity: 4 });
                  setRoomModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors min-h-[44px] self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Bilik</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((r) => {
                const count = r._count.participants;
                const isFull = count >= r.capacity;
                const pct = Math.min(100, Math.round((count / r.capacity) * 100));

                return (
                  <div
                    key={r.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {r.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                isFull
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isFull ? "Penuh" : "Ada Kekosongan"}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              {count} / {r.capacity} orang
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRoom(r);
                              setRoomForm({ name: r.name, capacity: r.capacity });
                              setRoomModalOpen(true);
                            }}
                            title="Edit Bilik"
                            className="h-10 w-10 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "room",
                                id: r.id,
                                name: r.name,
                              })
                            }
                            title="Padam Bilik"
                            className="h-10 w-10 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3.5 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFull ? "bg-rose-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Members List */}
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                          Penghuni Bilik ({count}):
                        </span>
                        {r.participants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Belum ada peserta yang diagihkan ke bilik ini.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {r.participants.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs rounded-xl bg-slate-50 px-3 py-2 text-slate-700 min-h-[36px]"
                              >
                                <span className="font-semibold truncate mr-2">
                                  {p.name}
                                </span>
                                <span
                                  className="rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0"
                                  style={{
                                    backgroundColor: getSizeBadgeColor(p.size),
                                  }}
                                >
                                  {p.size}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TEAMS (2-3 Kolum pada Tablet & Desktop) */}
        {activeTab === "teams" && (
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Pengurusan Kumpulan (Teams)
                </h2>
                <p className="text-xs text-slate-500">
                  Urus nama, warna lencana, dan had muatan bagi kumpulan aktiviti.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setTeamForm({ name: "", color: "#ef4444", capacity: 7 });
                  setTeamModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors min-h-[44px] self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Team</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t) => {
                const count = t._count.participants;
                const isFull = count >= t.capacity;
                const pct = Math.min(100, Math.round((count / t.capacity) * 100));

                return (
                  <div
                    key={t.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full inline-block shadow-xs shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            <h3 className="font-extrabold text-slate-900 text-base">
                              {t.name}
                            </h3>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                isFull
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isFull ? "Penuh" : "Ada Kekosongan"}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              {count} / {t.capacity} orang
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTeam(t);
                              setTeamForm({
                                name: t.name,
                                color: t.color,
                                capacity: t.capacity,
                              });
                              setTeamModalOpen(true);
                            }}
                            title="Edit Team"
                            className="h-10 w-10 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "team",
                                id: t.id,
                                name: t.name,
                              })
                            }
                            title="Padam Team"
                            className="h-10 w-10 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3.5 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: t.color || "#3b82f6",
                          }}
                        />
                      </div>

                      {/* Members List */}
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                          Ahli Kumpulan ({count}):
                        </span>
                        {t.participants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Belum ada peserta yang diagihkan ke kumpulan ini.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {t.participants.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs rounded-xl bg-slate-50 px-3 py-2 text-slate-700 min-h-[36px]"
                              >
                                <span className="font-semibold truncate mr-2">
                                  {p.name}
                                </span>
                                <span
                                  className="rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0"
                                  style={{
                                    backgroundColor: getSizeBadgeColor(p.size),
                                  }}
                                >
                                  {p.size}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Tetapan Saiz Baju
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Konfigurasi pilihan saiz pakaian rasmi (contoh: S, M, L, XL, XXL, XXXL, 4XL) beserta warna lencana.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingSize(null);
                    setSizeForm({
                      name: "",
                      color: "#3b82f6",
                      sortOrder: sizes.length + 1,
                    });
                    setSizeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors min-h-[44px] self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Saiz Baru</span>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sizes.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 min-h-[52px]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-xl px-3 py-1.5 text-xs font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-semibold">
                        #{s.sortOrder}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSize(s);
                          setSizeForm({
                            name: s.name,
                            color: s.color,
                            sortOrder: s.sortOrder,
                          });
                          setSizeModalOpen(true);
                        }}
                        className="h-10 w-10 text-slate-400 hover:text-blue-600 rounded-xl flex items-center justify-center transition-colors"
                        title="Edit Saiz"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "size",
                            id: s.id,
                            name: `Saiz ${s.name}`,
                          })
                        }
                        className="h-10 w-10 text-slate-400 hover:text-rose-600 rounded-xl flex items-center justify-center transition-colors"
                        title="Padam Saiz"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-extrabold text-slate-900 mb-2">
                Maklumat Sistem & Pangkalan Data
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">
                    Lokasi DB (Coolify / Docker Volume)
                  </span>
                  <code className="text-blue-600 font-mono font-bold">/app/data/app.db</code>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">
                    Mod Keselamatan Sesi
                  </span>
                  <span className="font-medium">Cookie httpOnly bertandatangan HMAC-SHA256</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Tambah / Edit Peserta */}
      {participantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingParticipant ? "Kemaskini Peserta" : "Daftar Peserta Baru"}
              </h3>
              <button
                onClick={() => setParticipantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 h-10 w-10 rounded-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleParticipantSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penuh *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AIEMANARIF BIN NORAZLAN"
                  value={participantForm.name}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. Kad Pengenalan (IC)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 021020011763 (Kosongkan jika bukan warganegara)"
                  value={participantForm.ic}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, ic: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Boleh ditaip dengan atau tanpa tanda sempang (-).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Saiz Baju *
                </label>
                <select
                  value={participantForm.size}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, size: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                >
                  {sizes.map((s) => (
                    <option key={s.id} value={s.name}>
                      Saiz {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bilik Penginapan
                  </label>
                  <select
                    value={participantForm.roomId}
                    onChange={(e) =>
                      setParticipantForm({ ...participantForm, roomId: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                  >
                    <option value="">Belum Ditetapkan</option>
                    {rooms.map((r) => {
                      const isCurrent = editingParticipant?.roomId === r.id;
                      const isFull = r._count.participants >= r.capacity;
                      return (
                        <option
                          key={r.id}
                          value={r.id}
                          disabled={isFull && !isCurrent}
                        >
                          {r.name} ({r._count.participants}/{r.capacity})
                          {isFull && !isCurrent ? " - Penuh" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kumpulan (Team)
                  </label>
                  <select
                    value={participantForm.teamId}
                    onChange={(e) =>
                      setParticipantForm({ ...participantForm, teamId: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-300 px-3.5 py-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                  >
                    <option value="">Belum Ditetapkan</option>
                    {teams.map((t) => {
                      const isCurrent = editingParticipant?.teamId === t.id;
                      const isFull = t._count.participants >= t.capacity;
                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={isFull && !isCurrent}
                        >
                          {t.name} ({t._count.participants}/{t.capacity})
                          {isFull && !isCurrent ? " - Penuh" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Vegetarian, alergi makanan laut, pemandu..."
                  value={participantForm.remarks}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, remarks: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setParticipantModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 min-h-[44px]"
                >
                  Simpan Peserta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Bilik */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingRoom ? "Kemaskini Bilik" : "Tambah Bilik Baru"}
              </h3>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 h-10 w-10 rounded-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Bilik *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bilik Melati (101)"
                  value={roomForm.name}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kapasiti Maksimum (Orang) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={roomForm.capacity}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      capacity: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 min-h-[44px]"
                >
                  Simpan Bilik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Team */}
      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingTeam ? "Kemaskini Kumpulan" : "Tambah Kumpulan Baru"}
              </h3>
              <button
                onClick={() => setTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 h-10 w-10 rounded-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTeamSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kumpulan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Team Harimau"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Warna Lencana / Tema *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={teamForm.color}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, color: e.target.value })
                    }
                    className="h-11 w-14 rounded-xl border border-slate-300 p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={teamForm.color}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, color: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-mono text-slate-900 min-h-[46px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kapasiti Maksimum Ahli *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={teamForm.capacity}
                  onChange={(e) =>
                    setTeamForm({
                      ...teamForm,
                      capacity: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 min-h-[44px]"
                >
                  Simpan Kumpulan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Saiz Baju */}
      {sizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingSize ? "Kemaskini Saiz Baju" : "Tambah Saiz Baju Baru"}
              </h3>
              <button
                onClick={() => setSizeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 h-10 w-10 rounded-xl flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSizeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Saiz *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XS atau 4XL"
                  value={sizeForm.name}
                  onChange={(e) =>
                    setSizeForm({ ...sizeForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm uppercase text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Warna Lencana *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={sizeForm.color}
                    onChange={(e) =>
                      setSizeForm({ ...sizeForm, color: e.target.value })
                    }
                    className="h-11 w-14 rounded-xl border border-slate-300 p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={sizeForm.color}
                    onChange={(e) =>
                      setSizeForm({ ...sizeForm, color: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-mono text-slate-900 min-h-[46px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombor Turutan Susunan (Sort Order)
                </label>
                <input
                  type="number"
                  value={sizeForm.sortOrder}
                  onChange={(e) =>
                    setSizeForm({
                      ...sizeForm,
                      sortOrder: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[46px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSizeModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 min-h-[44px]"
                >
                  Simpan Saiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Pengesahan Padam */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              Sahkan Padam?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Adakah anda pasti mahu memadam{" "}
              <strong className="text-slate-800">&quot;{deleteConfirm.name}&quot;</strong>?
              Tindakan ini tidak boleh dikembalikan.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                className="rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 min-h-[44px]"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
