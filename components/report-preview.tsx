'use client';

import { useState, useEffect } from 'react';
import { distribusiApi, penerimaanApi, getAuthToken, laporanApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface ReportPreviewProps {
  filters: {
    tanggalMulai: string;
    tanggalAkhir: string;
    jenisData: string;
  };
}

export function ReportPreview({ filters }: ReportPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ count: 0, nominal: 0 });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let responseData: any[] = [];
      if (filters.jenisData === 'distribusi') {
        const res = await distribusiApi.list({ page: 1, limit: 100 });
        if (res.data) responseData = res.data;
      } else if (filters.jenisData === 'pengumpulan') {
        const res = await penerimaanApi.list({ page: 1, limit: 100 });
        if (res.data) responseData = res.data;
      } else if (filters.jenisData === 'kas_keluar_program') {
        const res = await (await fetch(`/api/laporan/distribusi-by-program?start_date=${filters.tanggalMulai}&end_date=${filters.tanggalAkhir}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })).json();
        if (res.data) responseData = res.data;
      } else if (filters.jenisData === 'kas_keluar_asnaf') {
        const res = await (await fetch(`/api/laporan/distribusi-by-asnaf?start_date=${filters.tanggalMulai}&end_date=${filters.tanggalAkhir}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })).json();
        if (res.data) responseData = res.data;
      } else if (filters.jenisData === 'kas_keluar_harian') {
        const res = await (await fetch(`/api/laporan/distribusi-harian?start_date=${filters.tanggalMulai}&end_date=${filters.tanggalAkhir}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })).json();
        if (res.data) responseData = res.data;
      }

      if (responseData.length > 0 || filters.jenisData.startsWith('kas_keluar')) {
        let filtered = responseData;

        // Only manually filter if it's the old raw endpoints
        if (filters.jenisData === 'distribusi' || filters.jenisData === 'pengumpulan') {
          filtered = responseData.filter((item: any) => {
            const itemDate = new Date(item.tanggal);
            const startDate = new Date(filters.tanggalMulai);
            const endDate = new Date(filters.tanggalAkhir);
            return itemDate >= startDate && itemDate <= endDate;
          });
        }

        setData(filtered);

        // Calculate totals
        const totalNominal = filtered.reduce((sum: number, item: any) => sum + (Number(item.nominal || item.jumlah) || 0), 0);
        setTotals({
          count: filtered.length,
          nominal: totalNominal,
        });
      } else {
        setData([]);
        setTotals({ count: 0, nominal: 0 });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview Laporan</CardTitle>
        <CardDescription>
          Periode: {new Date(filters.tanggalMulai).toLocaleDateString('id-ID')} - {new Date(filters.tanggalAkhir).toLocaleDateString('id-ID')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-secondary">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Transaksi</p>
                    <p className="text-3xl font-bold">{totals.count}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm opacity-90 mb-1">Total Nominal</p>
                    <p className="text-3xl font-bold">Rp {totals.nominal.toLocaleString('id-ID')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            {data.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      {filters.jenisData === 'distribusi' ? (
                        <>
                          <TableHead>Mustahiq</TableHead>
                          <TableHead>Jenis Zakat</TableHead>
                        </>
                      ) : filters.jenisData === 'pengumpulan' ? (
                        <>
                          <TableHead>Muzakki</TableHead>
                          <TableHead>Metode</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Nama / NRM</TableHead>
                          <TableHead>Informasi Laporan</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 10).map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{new Date(item.tanggal).toLocaleDateString('id-ID')}</TableCell>
                        {filters.jenisData === 'distribusi' ? (
                          <>
                            <TableCell>{item.nama_mustahiq || '-'}</TableCell>
                            <TableCell>{item.jenis_zakat}</TableCell>
                          </>
                        ) : filters.jenisData === 'pengumpulan' ? (
                          <>
                            <TableCell>{item.nama_muzakki || '-'}</TableCell>
                            <TableCell>{item.metode_pembayaran}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <div className="font-medium">{item.nama_mustahik || item.ref_nama_entita?.nama || '-'}</div>
                              <div className="text-xs text-muted-foreground">{item.nrm || '-'}</div>
                            </TableCell>
                            <TableCell>
                              {filters.jenisData === 'kas_keluar_program' && (
                                <span className="text-xs">{item.ref_program_kegiatan?.nama || '-'}</span>
                              )}
                              {filters.jenisData === 'kas_keluar_asnaf' && (
                                <span className="text-xs">{item.asnaf?.nama || item.ref_asnaf?.nama || '-'}</span>
                              )}
                              {filters.jenisData === 'kas_keluar_harian' && (
                                <span className="text-xs">{(item.keterangan || 'Penyaluran Tunai').substring(0, 30)}</span>
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right font-medium">
                          Rp {(Number(item.nominal || item.jumlah) || 0).toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Tidak ada data dalam periode yang dipilih
              </div>
            )}

            {data.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                Menampilkan 10 dari {data.length} data. Laporan lengkap akan diexport dalam file Word.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
