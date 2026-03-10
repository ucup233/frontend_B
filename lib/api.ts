const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5501';
const API_BASE_URL = rawApiUrl.startsWith('http') ? rawApiUrl : `https://${rawApiUrl}`;


export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('authToken', token);
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = sessionStorage.getItem('authToken');
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('authToken');
  }
}

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Helper untuk build query string dari object params
function buildQuery(params: Record<string, any>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      p.append(key, String(value));
    }
  });
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

// ─────────────────────────────────────────
// 1. AUTH
// ─────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuth: true,
    }),

  /** GET /api/auth/me */
  getMe: () => apiFetch<any>('/api/auth/me', { method: 'GET' }),

  /** POST /api/auth/logout */
  logout: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),
};

// ─────────────────────────────────────────
// 2. MUZAKKI
// ─────────────────────────────────────────
export interface MuzakkiListParams {
  q?: string;
  jenis_muzakki_id?: number;
  jenis_upz_id?: number;
  status?: 'active' | 'inactive';
  kelurahan_id?: number;
  kecamatan_id?: number;
  page?: number;
  limit?: number;
}

export interface MuzakkiBody {
  npwz?: string;
  nama?: string;
  nik?: string;
  no_hp?: string;
  jenis_muzakki_id?: number;
  jenis_upz_id?: number;
  alamat?: string;
  kelurahan_id?: number;
  kecamatan_id?: number;
  keterangan?: string;
  registered_by?: number;
}

export const muzakkiApi = {
  /** GET /api/muzakki */
  list: (params: MuzakkiListParams = {}) =>
    apiFetch<any[]>(`/api/muzakki${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/muzakki/:id */
  get: (id: number) =>
    apiFetch<any>(`/api/muzakki/${id}`, { method: 'GET' }),

  /** GET /api/muzakki/:id/riwayat */
  getRiwayat: (id: number, params: { tahun?: number; bulan?: number; page?: number; limit?: number } = {}) =>
    apiFetch<any[]>(`/api/muzakki/${id}/riwayat${buildQuery(params)}`, { method: 'GET' }),

  /** POST /api/muzakki */
  create: (data: MuzakkiBody) =>
    apiFetch<any>('/api/muzakki', { method: 'POST', body: JSON.stringify(data) }),

  /** PUT /api/muzakki/:id */
  update: (id: number, data: MuzakkiBody) =>
    apiFetch<any>(`/api/muzakki/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** PUT /api/muzakki/:id/status */
  updateStatus: (id: number, status: 'active' | 'inactive') =>
    apiFetch<any>(`/api/muzakki/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  /** DELETE /api/muzakki/:id (Superadmin Only) */
  delete: (id: number) =>
    apiFetch<void>(`/api/muzakki/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────
// 3. MUSTAHIQ
// ─────────────────────────────────────────
export interface MustahiqListParams {
  q?: string;
  asnaf_id?: number;
  kategori_mustahiq_id?: number;
  status?: 'active' | 'inactive' | 'blacklist';
  kelurahan_id?: number;
  kecamatan_id?: number;
  page?: number;
  limit?: number;
}

export interface MustahiqBody {
  nrm?: string;
  nik?: string;
  nama?: string;
  no_hp?: string;
  alamat?: string;
  kelurahan_id?: number;
  kecamatan_id?: number;
  kategori_mustahiq_id?: number;
  asnaf_id?: number;
  rekomendasi_upz?: string;
  keterangan?: string;
  registered_by?: number;
}

export const mustahiqApi = {
  /** GET /api/mustahiq */
  list: (params: MustahiqListParams = {}) =>
    apiFetch<any[]>(`/api/mustahiq${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/mustahiq/:id */
  get: (id: number) =>
    apiFetch<any>(`/api/mustahiq/${id}`, { method: 'GET' }),

  /** GET /api/mustahiq/:id/riwayat */
  getRiwayat: (id: number, params: { tahun?: number; bulan?: number; page?: number; limit?: number } = {}) =>
    apiFetch<any[]>(`/api/mustahiq/${id}/riwayat${buildQuery(params)}`, { method: 'GET' }),

  /** POST /api/mustahiq */
  create: (data: MustahiqBody) =>
    apiFetch<any>('/api/mustahiq', { method: 'POST', body: JSON.stringify(data) }),

  /** PUT /api/mustahiq/:id */
  update: (id: number, data: MustahiqBody) =>
    apiFetch<any>(`/api/mustahiq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** PUT /api/mustahiq/:id/status */
  updateStatus: (id: number, status: 'active' | 'inactive' | 'blacklist', keterangan?: string) =>
    apiFetch<any>(`/api/mustahiq/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, keterangan }),
    }),

  /** DELETE /api/mustahiq/:id (Superadmin Only) */
  delete: (id: number) =>
    apiFetch<void>(`/api/mustahiq/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────
// 4. PENERIMAAN ZIS  (dulu: pengumpulan)
// ─────────────────────────────────────────
export interface PenerimaanListParams {
  q?: string;
  muzakki_id?: number;
  tanggal?: string;
  bulan?: number;
  tahun?: number;
  via_id?: number;
  metode_bayar_id?: number;
  zis_id?: number;
  jenis_zis_id?: number;
  page?: number;
  limit?: number;
}

export interface PenerimaanBody {
  muzakki_id?: number;
  tanggal?: string;
  via_id?: number;
  metode_bayar_id?: number;
  no_rekening?: string;
  zis_id?: number;
  jenis_zis_id?: number;
  jumlah?: number;
  persentase_amil_id?: number;
  keterangan?: string;
  rekomendasi_upz?: string;
  created_by?: number;
}

export const penerimaanApi = {
  /** GET /api/penerimaan */
  list: (params: PenerimaanListParams = {}) =>
    apiFetch<any[]>(`/api/penerimaan${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/penerimaan/:id */
  get: (id: number) =>
    apiFetch<any>(`/api/penerimaan/${id}`, { method: 'GET' }),

  /** GET /api/penerimaan/:id/cetak — download PDF bukti setor */
  cetakUrl: (id: number) => `${API_BASE_URL}/api/penerimaan/${id}/cetak`,

  /** GET /api/penerimaan/rekap/harian */
  rekapHarian: (tanggal: string) =>
    apiFetch<any>(`/api/penerimaan/rekap/harian${buildQuery({ tanggal })}`, { method: 'GET' }),

  /** GET /api/penerimaan/rekap/bulanan */
  rekapBulanan: (bulan: number, tahun: number) =>
    apiFetch<any>(`/api/penerimaan/rekap/bulanan${buildQuery({ bulan, tahun })}`, { method: 'GET' }),

  /** GET /api/penerimaan/rekap/tahunan */
  rekapTahunan: (tahun: number) =>
    apiFetch<any>(`/api/penerimaan/rekap/tahunan${buildQuery({ tahun })}`, { method: 'GET' }),

  /** POST /api/penerimaan */
  create: (data: PenerimaanBody) =>
    apiFetch<any>('/api/penerimaan', { method: 'POST', body: JSON.stringify(data) }),

  /** PUT /api/penerimaan/:id (Superadmin Only) */
  update: (id: number, data: PenerimaanBody) =>
    apiFetch<any>(`/api/penerimaan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** DELETE /api/penerimaan/:id (Superadmin Only) */
  delete: (id: number) =>
    apiFetch<void>(`/api/penerimaan/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────
// 5. DISTRIBUSI  (dulu: penyaluran)
// ─────────────────────────────────────────
export interface DistribusiListParams {
  q?: string;
  mustahiq_id?: number;
  tanggal?: string;
  bulan?: number;
  tahun?: number;
  startDate?: string;
  endDate?: string;
  nama_program_id?: number;
  sub_program_id?: number;
  program_kegiatan_id?: number;
  asnaf_id?: number;
  via_id?: number;
  status?: 'diterima' | 'ditolak' | '';
  page?: number;
  limit?: number;
}

export interface DistribusiBody {
  mustahiq_id?: number;
  tanggal?: string;
  nama_program_id?: number;
  sub_program_id?: number;
  program_kegiatan_id?: number;
  frekuensi_bantuan_id?: number;
  jumlah?: number;
  quantity?: number;
  nama_entitas_id?: number;
  kategori_mustahiq_id?: number;
  jenis_zis_distribusi_id?: number;
  no_rekening?: string;
  rekomendasi_upz?: string;
  keterangan?: string;
  tgl_masuk_permohonan?: string;
  tgl_survei?: string;
  surveyor?: string;
  jumlah_permohonan?: number;
  status?: 'diterima' | 'ditolak';
  no_reg_bpp?: string;
  created_by?: number;
}

export const distribusiApi = {
  /** GET /api/distribusi */
  list: (params: DistribusiListParams = {}) =>
    apiFetch<any[]>(`/api/distribusi${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/distribusi/:id */
  get: (id: number) =>
    apiFetch<any>(`/api/distribusi/${id}`, { method: 'GET' }),

  /** GET /api/distribusi/:id/cetak — download PDF bukti penyaluran */
  cetakUrl: (id: number) => `${API_BASE_URL}/api/distribusi/${id}/cetak`,

  /** GET /api/distribusi/rekap/bulanan */
  rekapBulanan: (bulan: number | string, tahun: number) =>
    apiFetch<any>(`/api/distribusi/rekap/bulanan${buildQuery({ bulan, tahun })}`, { method: 'GET' }),

  /** GET /api/distribusi/stats */
  getStats: (params: { bulan?: string; tahun?: number } = {}) =>
    apiFetch<any>(`/api/distribusi/stats${buildQuery(params)}`, { method: 'GET' }),

  /** POST /api/distribusi */
  create: (data: DistribusiBody) =>
    apiFetch<any>('/api/distribusi', { method: 'POST', body: JSON.stringify(data) }),

  /** PUT /api/distribusi/:id (Superadmin Only) */
  update: (id: number, data: DistribusiBody) =>
    apiFetch<any>(`/api/distribusi/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** DELETE /api/distribusi/:id (Superadmin Only) */
  delete: (id: number) =>
    apiFetch<void>(`/api/distribusi/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────
// 6. DASHBOARD
// ─────────────────────────────────────────
export interface DashboardParams {
  tahun?: number;
  bulan?: number;
  tanggal?: string;
}

export const dashboardApi = {
  /** GET /api/dashboard */
  getUtama: (params: DashboardParams = {}) =>
    apiFetch<any>(`/api/dashboard${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/dashboard-penerimaan/summary */
  getSummary: (params: DashboardParams = {}) =>
    apiFetch<any>(`/api/dashboard-penerimaan/summary${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/dashboard-penerimaan/by-upz */
  getByUpz: (params: DashboardParams = {}) =>
    apiFetch<any>(`/api/dashboard-penerimaan/by-upz${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/dashboard-penerimaan/by-channel */
  getByChannel: (params: DashboardParams = {}) =>
    apiFetch<any>(`/api/dashboard-penerimaan/by-channel${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/dashboard-penerimaan/zakat-breakdown */
  getZakatBreakdown: (params: DashboardParams = {}) =>
    apiFetch<any>(`/api/dashboard-penerimaan/zakat-breakdown${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/dashboard-penerimaan/infaq-breakdown */
  getInfaqBreakdown: (params: DashboardParams = {}) =>
    apiFetch<any>(`/api/dashboard-penerimaan/infaq-breakdown${buildQuery(params)}`, { method: 'GET' }),
};

// ─────────────────────────────────────────
// 7. REFERENCE  (/ref/:resource)
// ─────────────────────────────────────────
// Resource names sesuai tabel tanpa prefix ref_
export type RefResource =
  | 'kecamatan'
  | 'kelurahan'
  | 'asnaf'
  | 'jenis-muzakki'
  | 'jenis-upz'
  | 'jenis-zis'
  | 'kategori-mustahiq'
  | 'via-penerimaan'
  | 'metode-bayar'
  | 'nama-program'
  | 'sub-program'
  | 'program-kegiatan'
  | 'frekuensi-bantuan'
  | 'persentase-amil'
  | string; // untuk resource lainnya

export const refApi = {
  /** GET /api/ref/:resource */
  list: (resource: RefResource, query?: Record<string, any>) =>
    apiFetch<any[]>(`/api/ref/${resource}${buildQuery(query ?? {})}`, { method: 'GET' }),

  /** GET /api/ref/:resource/:id */
  get: (resource: RefResource, id: number) =>
    apiFetch<any>(`/api/ref/${resource}/${id}`, { method: 'GET' }),

  /** POST /api/ref/:resource */
  create: (resource: RefResource, data: Record<string, any>) =>
    apiFetch<any>(`/api/ref/${resource}`, { method: 'POST', body: JSON.stringify(data) }),

  /** PUT /api/ref/:resource/:id */
  update: (resource: RefResource, id: number, data: Record<string, any>) =>
    apiFetch<any>(`/api/ref/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** DELETE /api/ref/:resource/:id (soft delete) */
  delete: (resource: RefResource, id: number) =>
    apiFetch<void>(`/api/ref/${resource}/${id}`, { method: 'DELETE' }),

  // ── Shortcut helpers yang sering dipakai ──
  getKecamatan: () => refApi.list('kecamatan'),
  getKelurahan: (kecamatanId?: number) =>
    refApi.list('kelurahan', kecamatanId ? { kecamatan_id: kecamatanId } : undefined),
  getAsnaf: () => refApi.list('asnaf'),
  getJenisZis: () => refApi.list('jenis-zis'),
  getJenisMuzakki: () => refApi.list('jenis-muzakki'),
  getJenisUpz: () => refApi.list('jenis-upz'),
  getKategoriMustahiq: () => refApi.list('kategori-mustahiq'),
  getViaPenerimaan: () => refApi.list('via-penerimaan'),
  getMetodeBayar: () => refApi.list('metode-bayar'),
  getNamaProgram: () => refApi.list('nama-program'),
  getSubProgram: () => refApi.list('sub-program'),
  getProgramKegiatan: () => refApi.list('program-kegiatan'),
  getFrekuensiBantuan: () => refApi.list('frekuensi-bantuan'),
  getPersentaseAmil: () => refApi.list('persentase-amil'),
};

// ─────────────────────────────────────────
// 8. LAPORAN & EXPORT
// ─────────────────────────────────────────
export interface LaporanParams {
  bulan?: number;
  tahun?: number;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
}

export const laporanApi = {
  /** GET /api/laporan/penerimaan/export — Excel */
  exportPenerimaanUrl: (params: LaporanParams = {}) =>
    `${API_BASE_URL}/api/laporan/penerimaan/export${buildQuery(params)}`,

  /** GET /api/laporan/distribusi/export — Excel */
  exportDistribusiUrl: (params: LaporanParams = {}) =>
    `${API_BASE_URL}/api/laporan/distribusi/export${buildQuery(params)}`,

  /** GET /api/laporan/mustahiq/export — Excel */
  exportMustahiqUrl: (params: LaporanParams = {}) =>
    `${API_BASE_URL}/api/laporan/mustahiq/export${buildQuery(params)}`,

  /** GET /api/laporan/muzakki/export — Excel */
  exportMuzakkiUrl: (params: LaporanParams = {}) =>
    `${API_BASE_URL}/api/laporan/muzakki/export${buildQuery(params)}`,

  /** GET /api/laporan/arus-kas — JSON */
  getArusKas: (params: LaporanParams = {}) =>
    apiFetch<any>(`/api/laporan/arus-kas${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/laporan/arus-kas/export — PDF */
  exportArusKasUrl: (params: LaporanParams = {}) =>
    `${API_BASE_URL}/api/laporan/arus-kas/export${buildQuery(params)}`,

  /** GET /api/laporan/neraca — JSON */
  getNeraca: (params: LaporanParams = {}) =>
    apiFetch<any>(`/api/laporan/neraca${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/laporan/neraca/export — PDF */
  exportNeracaUrl: (params: LaporanParams = {}) =>
    `${API_BASE_URL}/api/laporan/neraca/export${buildQuery(params)}`,

  /** GET /api/laporan/distribusi-by-program */
  getDistribusiByProgram: (params: { start_date?: string; end_date?: string } = {}) =>
    apiFetch<any[]>(`/api/laporan/distribusi-by-program${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/laporan/distribusi-by-asnaf */
  getDistribusiByAsnaf: (params: { start_date?: string; end_date?: string } = {}) =>
    apiFetch<any[]>(`/api/laporan/distribusi-by-asnaf${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/laporan/distribusi-harian */
  getDistribusiHarian: (params: { start_date?: string; end_date?: string } = {}) =>
    apiFetch<any[]>(`/api/laporan/distribusi-harian${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/laporan/perubahan-dana */
  getPerubahanDana: (params: { tanggal?: string; bulan?: string; tahun?: number } = {}) =>
    apiFetch<any>(`/api/laporan/perubahan-dana${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/laporan/perubahan-dana/export — PDF */
  exportPerubahanDanaUrl: (params: { tanggal?: string; bulan?: string; tahun?: number } = {}) =>
    `${API_BASE_URL}/api/laporan/perubahan-dana/export${buildQuery(params)}`,

  /** GET /api/laporan/kas-masuk-harian */
  getKasMasukHarian: (params: { tanggal?: string } = {}) =>
    apiFetch<any>(`/api/laporan/kas-masuk-harian${buildQuery(params)}`, { method: 'GET' }),
};

// ─────────────────────────────────────────
// 9. USER MANAGEMENT  (Superadmin Only)
// ─────────────────────────────────────────
export type UserRole = 'superadmin' | 'pelayanan' | 'pendistribusian' | 'keuangan' | 'penerimaan';

export interface UserListParams {
  q?: string;
  role?: UserRole;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: any[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserBody {
  username?: string;
  password?: string;
  nama?: string;
  role?: UserRole;
}

export const userApi = {
  /** GET /api/users */
  list: (params: UserListParams = {}) =>
    apiFetch<UserListResponse>(`/api/users${buildQuery(params)}`, { method: 'GET' }),

  /** GET /api/users/:id */
  get: (id: number) =>
    apiFetch<any>(`/api/users/${id}`, { method: 'GET' }),

  /** POST /api/users — body: { username, password, nama, role } */
  create: (data: UserBody) =>
    apiFetch<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  /** PUT /api/users/:id */
  update: (id: number, data: UserBody) =>
    apiFetch<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** DELETE /api/users/:id */
  delete: (id: number) =>
    apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' }),
};

export const migrasiApi = {
  /** GET /api/migrasi/template/:jenis */
  templateUrl: (jenis: string) =>
    `${API_BASE_URL}/api/migrasi/template/${jenis}`,

  /** GET /api/migrasi/template/:jenis (Authenticated Download) */
  downloadTemplate: async (jenis: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/migrasi/template/${jenis}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return res.blob();
  },

  /** GET /api/migrasi/log */
  getLog: (params: { page?: number; limit?: number; jenis?: string } = {}) =>
    apiFetch<any[]>(`/api/migrasi/log${buildQuery(params)}`, { method: 'GET' }),

  /** POST /api/migrasi/preview */
  preview: (file: File, jenis: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jenis', jenis);
    return fetch(`${API_BASE_URL}/api/migrasi/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData,
    }).then(r => r.json());
  },

  /** POST /api/migrasi/import */
  import: (file: File, jenis: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jenis', jenis);
    return fetch(`${API_BASE_URL}/api/migrasi/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData,
    }).then(r => r.json());
  },
};

