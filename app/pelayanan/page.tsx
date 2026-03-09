'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { mustahiqApi, refApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle, Loader2, Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';
import { MustahiqForm } from '@/components/mustahiq-form';
import { AjuPermohonanForm } from '@/components/aju-permohonan-form';

function refName(list: any[], id: any): string {
  if (!id) return '-';
  const found = list.find((r) => r.id === id || r.id === Number(id));
  return found?.nama ?? String(id);
}

export default function PelayananPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [mustahiqList, setMustahiqList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [asnafList, setAsnafList] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  const [kelurahanAll, setKelurahanAll] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Aju Permohonan state
  const [ajuOpen, setAjuOpen] = useState(false);
  const [ajuMustahiq, setAjuMustahiq] = useState<{ id: number; label: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const [asnafRes, kecRes, kategoriRes, kelRes] = await Promise.all([
          refApi.getAsnaf(), refApi.getKecamatan(), refApi.getKategoriMustahiq(), refApi.list('kelurahan'),
        ]);
        if (asnafRes.data) setAsnafList(asnafRes.data as any[]);
        if (kecRes.data) setKecamatanList(kecRes.data as any[]);
        if (kategoriRes.data) setKategoriList(kategoriRes.data as any[]);
        if (kelRes.data) setKelurahanAll(kelRes.data as any[]);
      } catch (err) { console.error('Gagal memuat referensi:', err); }
    };
    load();
  }, []);

  useEffect(() => { fetchMustahiq(); }, [page, limit, searchQ]);

  const fetchMustahiq = async () => {
    setIsLoading(true); setError(null);
    try {
      const response = await mustahiqApi.list({ q: searchQ || undefined, page, limit });
      const resData: any = response;
      if (resData) {
        const arr = resData.data ?? [];
        setMustahiqList(arr);
        setTotal(resData.total ?? arr.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data Mustahiq');
    } finally { setIsLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearchQ(searchInput); };
  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try { await mustahiqApi.delete(id); fetchMustahiq(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menghapus'); }
  };
  const handleEdit = (id: number) => { setEditingId(id); setFormOpen(true); };
  const handleFormSuccess = () => { setFormOpen(false); setEditingId(null); fetchMustahiq(); };

  const handleViewDetail = async (id: number) => {
    setDetailOpen(true); setDetailLoading(true); setDetailData(null);
    try { const res = await mustahiqApi.get(id); if (res.data) setDetailData(res.data); }
    catch { setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  const handleAjuPermohonan = (m: any) => {
    const label = `${m.nama}${m.nrm ? ` (${m.nrm})` : ''}`;
    setAjuMustahiq({ id: m.id, label });
    setAjuOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mustahiq</h1>
            <p className="text-muted-foreground mt-1">Kelola data penerima zakat (Mustahiq)</p>
          </div>
          <Button onClick={() => { setEditingId(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Mustahiq
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <Input placeholder="Cari nama / NRM / NIK..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
          {searchQ && <Button type="button" variant="ghost" onClick={() => { setSearchInput(''); setSearchQ(''); setPage(1); }}>Reset</Button>}
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Mustahiq</CardTitle>
            <CardDescription>
              {searchQ ? `Hasil pencarian "${searchQ}" — ` : ''}Total: {total > 0 ? total : mustahiqList.length} data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : mustahiqList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQ ? `Tidak ada data untuk "${searchQ}"` : 'Belum ada data Mustahiq'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">No.</TableHead>
                      <TableHead>NRM</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIK</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mustahiqList.map((m, index) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                        <TableCell className="font-medium">{m.nrm || '-'}</TableCell>
                        <TableCell>{m.nama}</TableCell>
                        <TableCell>{m.nik || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="secondary" onClick={() => handleAjuPermohonan(m)}>
                              <FileText className="h-4 w-4 mr-1" /> Aju Permohonan
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleViewDetail(m.id)} title="Detail">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(m.id)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)} title="Hapus">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

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
          </CardContent>
        </Card>
      </div>

      {/* ── Dialog: Tambah / Edit Mustahiq (3/4 screen) ── */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingId(null); }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-none h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{editingId ? 'Edit Mustahiq' : 'Tambah Mustahiq Baru'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <MustahiqForm onSuccess={handleFormSuccess} editingId={editingId}
              onCancelEdit={() => { setFormOpen(false); setEditingId(null); }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detail (normal size) ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-7xl sm:max-w-none w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detail Mustahiq</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : detailData ? (
            <div className="space-y-3 text-sm">
              <Row label="NRM" value={detailData.nrm} />
              <Row label="Nama" value={detailData.nama} />
              <Row label="NIK" value={detailData.nik} />
              <Row label="No HP" value={detailData.no_hp} />
              <Row label="Jenis Kelamin" value={detailData.jenis_kelamin} />
              <Row label="Tgl. Lahir" value={detailData.tgl_lahir ? new Date(detailData.tgl_lahir).toLocaleDateString('id-ID') : undefined} />
              <Row label="Tgl. Registrasi" value={detailData.registered_date ? new Date(detailData.registered_date).toLocaleDateString('id-ID') : undefined} />
              <Row label="Alamat" value={detailData.alamat} />
              <Row label="Kecamatan" value={detailData.kecamatan?.nama ?? refName(kecamatanList, detailData.kecamatan_id)} />
              <Row label="Kelurahan" value={detailData.kelurahan?.nama ?? refName(kelurahanAll, detailData.kelurahan_id)} />
              <Row label="Asnaf" value={detailData.asnaf?.nama ?? refName(asnafList, detailData.asnaf_id)} />
              <Row label="Kategori" value={detailData.kategoriMustahiq?.nama ?? refName(kategoriList, detailData.kategori_mustahiq_id)} />

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium uppercase text-xs tracking-wider">Statistik Penyaluran</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-muted/50 p-3 rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Jumlah Penyaluran</div>
                    <div className="text-lg font-bold">{detailData.total_penerimaan_count || 0} kali</div>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <div className="text-xs text-primary/70 mb-1 font-medium">Total Bantuan Disalurkan</div>
                    <div className="text-lg font-bold text-primary">Rp {Number(detailData.total_penerimaan_amount || 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>

              {detailData.rekomendasi_upz && <Row label="Rek. UPZ" value={detailData.rekomendasi_upz} />}
              {detailData.keterangan && <Row label="Keterangan" value={detailData.keterangan} />}
              <div className="flex gap-2 pt-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); handleEdit(detailData.id); }}>
                  <Edit className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setDetailOpen(false); handleAjuPermohonan(detailData); }}>
                  <FileText className="mr-1 h-3 w-3" /> Aju Permohonan
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Data tidak ditemukan</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Aju Permohonan (3/4 screen) ── */}
      <Dialog open={ajuOpen} onOpenChange={(o) => { setAjuOpen(o); if (!o) setAjuMustahiq(null); }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-none h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Aju Permohonan — {ajuMustahiq?.label}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            {ajuMustahiq && (
              <AjuPermohonanForm
                mustahiqId={ajuMustahiq.id}
                mustahiqLabel={ajuMustahiq.label}
                onSuccess={() => { setAjuOpen(false); setAjuMustahiq(null); }}
                onCancel={() => { setAjuOpen(false); setAjuMustahiq(null); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Row({ label, value, children }: { label: string; value?: any; children?: React.ReactNode }) {
  return (
    <div className="flex gap-2 border-b pb-2 last:border-0">
      <span className="font-medium w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1">{children ?? (value != null && value !== '' ? String(value) : '-')}</span>
    </div>
  );
}
