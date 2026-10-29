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
        router.push("/admin/login");
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
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
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
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-4 max-w-md">
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-800">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                EVENT LOGISTICS
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Admin
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Room & Team Allocation
            </h1>
          </div>

          {/* Navigation Pill (Rooms, Teams, Directory, Settings) */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab("rooms")}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  activeTab === "rooms"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Bed className="h-4 w-4" />
                <span>Rooms</span>
              </button>

              <button
                onClick={() => setActiveTab("teams")}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  activeTab === "teams"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Teams</span>
              </button>

              <button
                onClick={() => setActiveTab("directory")}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  activeTab === "directory"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ListFilter className="h-4 w-4" />
                <span>Directory</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                title="Tetapan Saiz Baju & Sistem"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  activeTab === "settings"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>

            {/* Quick Public Link & Logout */}
            <div className="flex items-center gap-1 pl-1">
              <Link
                href="/semak"
                target="_blank"
                title="Buka Halaman Semakan Awam"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                onClick={handleLogout}
                title="Log Keluar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 shadow-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TOP SUMMARY CARD (Kad Ringkasan) */}
        {stats && (
          <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Total Participants */}
              <div className="flex items-center gap-4 shrink-0 lg:pr-8 lg:border-r border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
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
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600">Room allocation</span>
                    <span className="text-slate-900 font-bold">
                      {stats.roomAllocationPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${stats.roomAllocationPercent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">
                      {stats.roomAssignedCount} assigned
                    </span>{" "}
                    · {stats.roomPendingCount} pending
                  </div>
                </div>

                {/* Team Allocation */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600">Team allocation</span>
                    <span className="text-slate-900 font-bold">
                      {stats.teamAllocationPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${stats.teamAllocationPercent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">
                      {stats.teamAssignedCount} assigned
                    </span>{" "}
                    · {stats.teamPendingCount} pending
                  </div>
                </div>
              </div>

              {/* Shirt Size Badges Row */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 lg:pl-8 lg:border-l border-slate-100">
                {stats.sizes.map((s) => (
                  <div
                    key={s.name}
                    className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 text-xs font-bold shadow-xs bg-slate-50"
                  >
                    <span
                      className="px-2 py-1 text-white font-extrabold text-[11px]"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name}
                    </span>
                    <span className="px-2 py-1 text-slate-700 bg-white">
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
            {/* Filter & Action Bar */}
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or IC number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Size Filter */}
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  aria-label="Filter saiz baju"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">Any team status</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Pending (Belum)</option>
                </select>

                {/* Export CSV Button */}
                <a
                  href="/api/admin/export"
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Peserta</span>
                </button>
              </div>
            </div>

            {/* DIRECTORY TABLE (DESKTOP) */}
            <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Participant</th>
                    <th className="py-3 px-4 text-center">Size</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
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
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Participant Name & IC */}
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-slate-900">
                              {p.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono tracking-wide mt-0.5">
                              {formatDisplayIC(p)}
                            </div>
                          </td>

                          {/* Size */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className="inline-block rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-xs"
                              style={{ backgroundColor: getSizeBadgeColor(p.size) }}
                            >
                              {p.size}
                            </span>
                          </td>

                          {/* Room Dropdown (Quick Allocation) */}
                          <td className="py-3.5 px-4">
                            <select
                              value={p.roomId || ""}
                              onChange={(e) =>
                                handleQuickAllocate(p.id, "roomId", e.target.value)
                              }
                              aria-label={`Pilih bilik untuk ${p.name}`}
                              className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px]"
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

                          {/* Team Dropdown (Quick Allocation) */}
                          <td className="py-3.5 px-4">
                            <select
                              value={p.teamId || ""}
                              onChange={(e) =>
                                handleQuickAllocate(p.id, "teamId", e.target.value)
                              }
                              aria-label={`Pilih kumpulan untuk ${p.name}`}
                              className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px]"
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
                          <td className="py-3.5 px-4 text-xs text-slate-500 max-w-[200px] truncate">
                            {p.remarks || "-"}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
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
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
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
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
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

            {/* DIRECTORY CARDS (MOBILE < 768px / 360px) */}
            <div className="block md:hidden space-y-3">
              {filteredParticipants.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                  {loading
                    ? "Memuat senarai peserta..."
                    : "Tiada peserta yang sepadan dengan carian."}
                </div>
              ) : (
                filteredParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="font-semibold text-slate-900 text-sm leading-snug">
                          {p.name}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDisplayIC(p)}
                        </span>
                      </div>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: getSizeBadgeColor(p.size) }}
                      >
                        {p.size}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Bilik
                        </label>
                        <select
                          value={p.roomId || ""}
                          onChange={(e) =>
                            handleQuickAllocate(p.id, "roomId", e.target.value)
                          }
                          aria-label={`Pilih bilik mobile untuk ${p.name}`}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs font-medium text-slate-800 shadow-xs"
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Team
                        </label>
                        <select
                          value={p.teamId || ""}
                          onChange={(e) =>
                            handleQuickAllocate(p.id, "teamId", e.target.value)
                          }
                          aria-label={`Pilih kumpulan mobile untuk ${p.name}`}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs font-medium text-slate-800 shadow-xs"
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
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mb-3">
                        <span className="font-semibold text-slate-600">Catatan: </span>
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
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                      >
                        <Edit2 className="h-3 w-3" />
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
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Padam</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS */}
        {activeTab === "rooms" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pengurusan Bilik</h2>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
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
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">
                            {r.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isFull
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isFull ? "Penuh" : "Ada Kekosongan"}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
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
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFull ? "bg-rose-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Members List */}
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Penghuni Bilik ({count}):
                        </span>
                        {r.participants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Belum ada peserta yang diagihkan ke bilik ini.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {r.participants.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700"
                              >
                                <span className="font-medium truncate mr-2">
                                  {p.name}
                                </span>
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0"
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

        {/* TAB 3: TEAMS */}
        {activeTab === "teams" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
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
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3.5 w-3.5 rounded-full inline-block shadow-xs"
                              style={{ backgroundColor: t.color }}
                            />
                            <h3 className="font-bold text-slate-900 text-base">
                              {t.name}
                            </h3>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isFull
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isFull ? "Penuh" : "Ada Kekosongan"}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
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
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
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
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Ahli Kumpulan ({count}):
                        </span>
                        {t.participants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Belum ada peserta yang diagihkan ke kumpulan ini.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {t.participants.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700"
                              >
                                <span className="font-medium truncate mr-2">
                                  {p.name}
                                </span>
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0"
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

        {/* TAB 4: SETTINGS (Saiz Baju & Konfigurasi) */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Saiz Baru</span>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sizes.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Susunan #{s.sortOrder}
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
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                        title="Edit Saiz"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "size",
                            id: s.id,
                            name: `Saiz ${s.name}`,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        title="Padam Saiz"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-2">
                Maklumat Sistem & Pangkalan Data
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Lokasi DB (Coolify / Docker Volume)
                  </span>
                  <code className="text-blue-600 font-mono">/app/data/app.db</code>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Mod Keselamatan Sesi
                  </span>
                  <span>Cookie httpOnly bertandatangan HMAC-SHA256</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Tambah / Edit Peserta */}
      {participantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingParticipant ? "Kemaskini Peserta" : "Daftar Peserta Baru"}
              </h3>
              <button
                onClick={() => setParticipantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleParticipantSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. Kad Pengenalan (IC)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 021020011763 atau 021020-01-1763 (Kosongkan jika bukan warganegara)"
                  value={participantForm.ic}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, ic: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Boleh ditaip dengan atau tanpa tanda sempang (-).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saiz Baju *
                </label>
                <select
                  value={participantForm.size}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, size: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bilik Penginapan
                  </label>
                  <select
                    value={participantForm.roomId}
                    onChange={(e) =>
                      setParticipantForm({ ...participantForm, roomId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kumpulan (Team)
                  </label>
                  <select
                    value={participantForm.teamId}
                    onChange={(e) =>
                      setParticipantForm({ ...participantForm, teamId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Vegetarian, alergi makanan laut, pemandu..."
                  value={participantForm.remarks}
                  onChange={(e) =>
                    setParticipantForm({ ...participantForm, remarks: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setParticipantModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRoom ? "Kemaskini Bilik" : "Tambah Bilik Baru"}
              </h3>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTeam ? "Kemaskini Kumpulan" : "Tambah Kumpulan Baru"}
              </h3>
              <button
                onClick={() => setTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTeamSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warna Lencana / Tema *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={teamForm.color}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, color: e.target.value })
                    }
                    className="h-10 w-12 rounded-lg border border-slate-300 p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={teamForm.color}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, color: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSize ? "Kemaskini Saiz Baju" : "Tambah Saiz Baju Baru"}
              </h3>
              <button
                onClick={() => setSizeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSizeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warna Badge *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={sizeForm.color}
                    onChange={(e) =>
                      setSizeForm({ ...sizeForm, color: e.target.value })
                    }
                    className="h-10 w-12 rounded-lg border border-slate-300 p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={sizeForm.color}
                    onChange={(e) =>
                      setSizeForm({ ...sizeForm, color: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSizeModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Sahkan Padam?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Adakah anda pasti mahu memadam{" "}
              <strong className="text-slate-800">&quot;{deleteConfirm.name}&quot;</strong>?
              Tindakan ini tidak boleh dikembalikan.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
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
