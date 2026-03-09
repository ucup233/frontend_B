'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { muzakkiApi, refApi } from '@/lib/api';
import { MuzakkiForm } from '@/components/muzakki-form';
import { PengumpulanForm } from '@/components/pengumpulan-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, Loader2, Plus, Edit, Trash2, Eye, Search, ChevronLeft, ChevronRight, Banknote
} from 'lucide-react';

export default function MuzakkiPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [list, setList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [penerimaanOpen, setPenerimaanOpen] = useState(false);
  const [penerimaanMuzakki, setPenerimaanMuzakki] = useState<{ id: number; label: string; jenis_muzakki_id?: number; jenis_upz_id?: number } | null>(null);

  // Ref data untuk resolusi ID → nama
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  const [kelurahanAll, setKelurahanAll] = useState<any[]>([]);
  const [jenisMuzakkiList, setJenisMuzakkiList] = useState<any[]>([]);
  const [jenisUpzList, setJenisUpzList] = useState<any[]>([]);

  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Helper: cari nama dari list ref berdasarkan ID
  const refName = (lst: any[], id: any): string => {
    if (!id) return '-';
    const found = lst.find((r) => r.id === id || r.id === Number(id));
    return found?.nama ?? String(id);
  };

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Load ref data sekali saja (kecuali kelurahan yang sangat besar)
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [kecRes, jmRes, jupzRes] = await Promise.all([
          refApi.list('kecamatan'),
          refApi.list('jenis-muzakki'),
          refApi.list('jenis-upz'),
        ]);
        if (Array.isArray(kecRes.data)) setKecamatanList(kecRes.data);
        if (Array.isArray(jmRes.data)) setJenisMuzakkiList(jmRes.data);
        if (Array.isArray(jupzRes.data)) setJenisUpzList(jupzRes.data);
      } catch (e) {
        console.error('Failed to load ref data', e);
      }
    };
    loadRefs();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQ(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { fetchData(); }, [page, limit, searchQ]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await muzakkiApi.list({ q: searchQ || undefined, page, limit });
      const resData: any = res;
      if (resData) {
        const arr = resData.data ?? [];
        setList(arr);
        setTotal(resData.total ?? arr.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data Muzakki');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQ(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus muzakki "${nama}"?`)) return;
    try {
      await muzakkiApi.delete(id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data');
    }
  };

  const handleViewDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await muzakkiApi.get(id);
      if (res.data) setDetailData(res.data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingId(null);
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Muzakki</h1>
            <p className="text-muted-foreground mt-1">Daftar pembayar zakat (Muzakki)</p>
          </div>
          <Button onClick={() => { setEditingId(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Muzakki
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <Input
            placeholder="Cari nama / NPWZ / NIK..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          {searchQ && (
            <Button type="button" variant="ghost" onClick={() => { setSearchInput(''); setSearchQ(''); setPage(1); }}>
              Reset
            </Button>
          )}
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Muzakki</CardTitle>
            <CardDescription>
              {searchQ ? `Hasil pencarian "${searchQ}" — ` : ''}
              Total: {total} data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : list.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQ ? `Tidak ada hasil untuk "${searchQ}"` : 'Belum ada data Muzakki'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">No.</TableHead>
                        <TableHead>NPWZ</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>NIK</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((m, index) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{m.npwz || '-'}</TableCell>
                          <TableCell className="font-medium">{m.nama}</TableCell>
                          <TableCell className="font-mono text-xs">{m.nik || '-'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => {
                              setPenerimaanMuzakki({
                                id: m.id,
                                label: `${m.nama}${m.npwz ? ` (${m.npwz})` : ''}`,
                                jenis_muzakki_id: m.jenis_muzakki_id,
                                jenis_upz_id: m.jenis_upz_id
                              });
                              setPenerimaanOpen(true);
                            }} title="Tambah Penerimaan">
                              <Banknote className="h-4 w-4 mr-1.5" /> Tambah Penerimaan
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleViewDetail(m.id)} title="Detail">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => { setEditingId(m.id); setFormOpen(true); }} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDelete(m.id, m.nama)} title="Hapus">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Entries per page:</span>
                    <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Halaman {page} dari {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog (Tambah / Edit) — 3/4 layar */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-none h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{editingId ? 'Edit Muzakki' : 'Tambah Muzakki Baru'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <MuzakkiForm
              onSuccess={handleFormSuccess}
              editingId={editingId}
              onCancelEdit={() => { setFormOpen(false); setEditingId(null); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-7xl sm:max-w-none w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Muzakki</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailData ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">NPWZ</span>
                <span className="font-mono">{detailData.npwz || '-'}</span>
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{detailData.nama}</span>
                <span className="text-muted-foreground">NIK</span>
                <span className="font-mono">{detailData.nik || '-'}</span>
                <span className="text-muted-foreground">No. HP</span>
                <span>{detailData.no_hp || '-'}</span>
                <span className="text-muted-foreground">NPWP</span>
                <span className="font-mono">{detailData.npwp || '-'}</span>
                <span className="text-muted-foreground">Jenis Kelamin</span>
                <span>{detailData.jenis_kelamin || '-'}</span>
                <span className="text-muted-foreground">Jenis Muzakki</span>
                <span>{detailData.JenisMuzakki?.nama || detailData.jenisMuzakki?.nama || detailData.jenis_muzakki?.nama || refName(jenisMuzakkiList, detailData.jenis_muzakki_id)}</span>
                <span className="text-muted-foreground">Jenis UPZ</span>
                <span>{detailData.JenisUpz?.nama || detailData.jenisUpz?.nama || detailData.jenis_upz?.nama || refName(jenisUpzList, detailData.jenis_upz_id)}</span>
                <span className="text-muted-foreground">Kecamatan</span>
                <span>{detailData.Kecamatan?.nama || detailData.kecamatan?.nama || detailData.nama_kecamatan || '-'}</span>
                <span className="text-muted-foreground">Kelurahan</span>
                <span>{detailData.Kelurahan?.nama || detailData.kelurahan?.nama || detailData.nama_kelurahan || '-'}</span>
                <span className="text-muted-foreground">Tanggal Registrasi</span>
                <span>{detailData.created_at ? new Date(detailData.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</span>

                <span className="text-muted-foreground border-t pt-2 mt-2">Jumlah Setoran</span>
                <span className="font-medium border-t pt-2 mt-2">{detailData.total_setor_count || 0} kali</span>
                <span className="text-muted-foreground">Total Nominal Setoran</span>
                <span className="font-bold text-primary">Rp {Number(detailData.total_setor_amount || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Data tidak ditemukan</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Tambah Penerimaan Dialog — pre-filled with Muzakki */}
      <Dialog open={penerimaanOpen} onOpenChange={(o) => { setPenerimaanOpen(o); if (!o) setPenerimaanMuzakki(null); }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-none h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>
              Tambah Penerimaan
              {penerimaanMuzakki && <span className="ml-2 text-muted-foreground font-normal text-sm">— {penerimaanMuzakki.label}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            {penerimaanMuzakki && (
              <PengumpulanForm
                onSuccess={() => { setPenerimaanOpen(false); setPenerimaanMuzakki(null); }}
                editingId={null}
                onCancelEdit={() => { setPenerimaanOpen(false); setPenerimaanMuzakki(null); }}
                prefillMuzakki={penerimaanMuzakki}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
