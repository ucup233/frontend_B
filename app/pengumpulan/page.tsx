'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { penerimaanApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Eye, Search, Printer } from 'lucide-react';
import { PengumpulanForm } from '@/components/pengumpulan-form';

export default function PengumpulanPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const isPelayanan = user?.role === 'pelayanan';

  const [list, setList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [jenisMuzakkiFilter, setJenisMuzakkiFilter] = useState<'all' | 'individu' | 'entitas'>('all');
  const [jenisMuzakkiList, setJenisMuzakkiList] = useState<any[]>([]);
  const [totalJumlah, setTotalJumlah] = useState(0);
  const [totalDanaBersih, setTotalDanaBersih] = useState(0);
  const [totalDanaAmil, setTotalDanaAmil] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Load jenis muzakki ref for filter
  useEffect(() => {
    import('@/lib/api').then(({ refApi }) => {
      refApi.list('jenis-muzakki').then((res: any) => {
        setJenisMuzakkiList(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setJenisMuzakkiList([]));
    });
  }, []);

  useEffect(() => { fetchData(); }, [page, limit, startDate, endDate, searchQ, jenisMuzakkiFilter, jenisMuzakkiList]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQ(searchInput);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchQ) params.q = searchQ;

      // Translate jenis muzakki group to IDs
      if (jenisMuzakkiFilter !== 'all' && jenisMuzakkiList.length > 0) {
        if (jenisMuzakkiFilter === 'individu') {
          const found = jenisMuzakkiList.find((j: any) => j.nama === 'Individu');
          if (found) params.jenis_muzakki_ids = String(found.id);
        } else if (jenisMuzakkiFilter === 'entitas') {
          // Entitas includes 'Entitas' and 'UPZ'
          const ids = jenisMuzakkiList
            .filter((j: any) => j.nama === 'Entitas' || j.nama === 'UPZ')
            .map((j: any) => j.id).join(',');
          if (ids) params.jenis_muzakki_ids = ids;
        }
      }

      const res: any = await penerimaanApi.list(params);
      if (res) {
        const arr = res.data ?? [];
        setList(arr);
        setTotal(res.total ?? arr.length);
        setTotalJumlah(Number(res.total_jumlah ?? 0));
        setTotalDanaBersih(Number(res.total_dana_bersih ?? 0));
        setTotalDanaAmil(Number(res.total_dana_amil ?? 0));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data Pengumpulan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await penerimaanApi.delete(id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data');
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingId(null);
    fetchData();
  };

  const handleViewDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await penerimaanApi.get(id);
      if (res.data) setDetailData(res.data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Penerimaan ZIS</h1>
            <p className="text-muted-foreground mt-1">Catat penerimaan ZIS</p>
          </div>
          {!isPelayanan && (
            <Button onClick={() => { setEditingId(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Pengumpulan
            </Button>
          )}
        </div>

        {/* Filter Bar — same layout as distribusi */}
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
          {/* Left Column: Search + Jenis Muzakki */}
          <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[400px]">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari Muzakki / Resi / No. Rek..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button type="submit" variant="default" size="sm" className="h-9 px-4">Cari</Button>
              {searchQ && (
                <Button type="button" variant="ghost" size="sm" className="h-9 px-2"
                  onClick={() => { setSearchInput(''); setSearchQ(''); setPage(1); }}>
                  Reset
                </Button>
              )}
            </form>

            {/* Jenis Muzakki Filters */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/20 border rounded-md">
              <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1.5 border-r pr-1.5 border-muted-foreground/30">Jenis Muzakki</span>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'individu', 'entitas'] as const).map((k) => (
                  <Button key={k} size="sm"
                    variant={jenisMuzakkiFilter === k ? 'default' : 'ghost'}
                    className={`h-7 text-[10px] px-2.5 ${jenisMuzakkiFilter === k ? 'shadow-sm' : 'hover:bg-muted'}`}
                    onClick={() => { setJenisMuzakkiFilter(k); setPage(1); }}>
                    {k === 'all' ? 'Semua' : k === 'individu' ? 'Individu' : 'Entitas'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Date Filter */}
          <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30 w-full lg:w-auto lg:ml-auto">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Filter Tanggal:</span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase ml-1">Dari</span>
                <Input type="date" size={1} className="h-8 text-xs w-36"
                  value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase ml-1">Sampai</span>
                <Input type="date" size={1} className="h-8 text-xs w-36"
                  value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
              </div>
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" className="h-8 mt-4 whitespace-nowrap"
                  onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}>
                  Bersihkan
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Daftar Penerimaan</CardTitle>
            <CardDescription>Total: {total} data</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : list.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Belum ada data Pengumpulan</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">No.</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Muzakki</TableHead>
                        <TableHead>ZIS</TableHead>
                        <TableHead>Via</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((p, index) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                          <TableCell>{new Date(p.tanggal).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell>{p.Muzakki?.nama || p.muzakki?.nama || p.nama_muzakki || '-'}</TableCell>
                          <TableCell>{p.zis?.nama || '-'}{p.jenis_zis?.nama ? ` / ${p.jenis_zis.nama}` : ''}</TableCell>
                          <TableCell>{p.via?.nama || '-'}</TableCell>
                          <TableCell className="text-right font-bold text-xs">Rp {(p.jumlah || 0).toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="icon" variant="outline" className="h-7 w-7"
                              onClick={() => handleViewDetail(p.id)} title="Detail">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {!isPelayanan && (
                              <>
                                <Button size="icon" variant="outline" className="h-7 w-7"
                                  onClick={() => { setEditingId(p.id); setFormOpen(true); }} title="Edit">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDelete(p.id)} title="Hapus">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
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

            {/* Total — aligned flush-right under Jumlah column */}
            {!isLoading && list.length > 0 && (
              <div className="border-t mt-2 pt-2 flex justify-end pr-[72px]">
                <span className="text-xs font-bold uppercase text-muted-foreground mr-3">Total di Halaman Ini:</span>
                <span className="text-xs font-bold text-primary">Rp {Number(list.reduce((sum: number, item: any) => sum + Number(item.jumlah || 0), 0)).toLocaleString('id-ID')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog — 3/4 layar */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) { setEditingId(null); }
      }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-none h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>
              {editingId ? 'Edit Penerimaan' : 'Tambah Penerimaan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <PengumpulanForm
              onSuccess={handleFormSuccess}
              editingId={editingId}
              onCancelEdit={() => { setFormOpen(false); setEditingId(null); }}
              isReadOnly={isPelayanan}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-7xl sm:max-w-none w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center pr-10">
              <DialogTitle>Detail Penerimaan</DialogTitle>
              {detailData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/pengumpulan/print/${detailData.id}`, '_blank')}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" /> Cetak Bukti Setoran
                </Button>
              )}
            </div>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailData ? (
            <div className="space-y-4 text-sm mt-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <span className="text-muted-foreground font-medium">Tanggal Pembayaran</span>
                <span>{detailData.tanggal ? new Date(detailData.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</span>

                <span className="text-muted-foreground font-medium border-t pt-3 mt-1">Muzakki</span>
                <span className="font-semibold border-t pt-3 mt-1 text-primary">{detailData.Muzakki?.nama || detailData.muzakki?.nama || detailData.nama_muzakki || '-'} {detailData.Muzakki?.npwz ? `(${detailData.Muzakki.npwz})` : ''}</span>

                <span className="text-muted-foreground font-medium">Jenis Muzakki</span>
                <span>{detailData.JenisMuzakki?.nama || detailData.jenis_muzakki?.nama || '-'}</span>

                <span className="text-muted-foreground font-medium">Jenis UPZ</span>
                <span>{detailData.JenisUpz?.nama || detailData.jenis_upz?.nama || '-'}</span>

                <span className="text-muted-foreground font-medium border-t pt-3 mt-1">ZIS</span>
                <span className="border-t pt-3 mt-1">{detailData.zis?.nama || detailData.Zis?.nama || '-'}</span>

                <span className="text-muted-foreground font-medium">Jenis Detail ZIS</span>
                <span>{detailData.jenis_zis?.nama || detailData.JenisZis?.nama || '-'}</span>

                <span className="text-muted-foreground font-medium border-t pt-3 mt-1">Jumlah Nominal</span>
                <span className="font-bold border-t pt-3 mt-1 text-base text-primary">Rp {Number(detailData.jumlah || 0).toLocaleString('id-ID')}</span>

                <span className="text-muted-foreground font-medium text-emerald-600">Dana Amil (12.5%)</span>
                <span className="font-bold text-emerald-600">Rp {Number(detailData.dana_amil || 0).toLocaleString('id-ID')}</span>

                <span className="text-muted-foreground font-medium border-t pt-3 mt-1">Via Pembayaran</span>
                <span className="border-t pt-3 mt-1">{detailData.via?.nama || detailData.ViaPenerimaan?.nama || '-'}</span>

                <span className="text-muted-foreground font-medium">Metode Bayar</span>
                <span>{detailData.MetodeBayar?.nama || detailData.metode_bayar?.nama || '-'}</span>

                <span className="text-muted-foreground font-medium">No. Rekening</span>
                <span className="font-mono text-xs">{detailData.no_rekening || '-'}</span>

                <span className="text-muted-foreground font-medium">Keterangan</span>
                <span className="italic">{detailData.keterangan || '-'}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Data tidak ditemukan</p>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout >
  );
}
