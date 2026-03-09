'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboardApi } from '@/lib/api';
import { toast } from 'sonner';
import { Users, UserCheck, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PenerimaanStats } from '@/components/penerimaan-stats';
import { DistribusiStats } from '@/components/distribusi-stats';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [viewMode, setViewMode] = useState<'ringkasan' | 'penerimaan' | 'distribusi'>('ringkasan');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Generate years from current back to 2020
  const years = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getUtama({ tahun: parseInt(selectedYear) });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-balance text-primary">Selamat Datang di BAZNAS Batam</h1>
            <p className="text-muted-foreground mt-2 font-medium">
              Sistem Manajemen Dana Zakat, Infaq, dan Sedekah
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
              <span className="text-sm font-semibold">Tampilan:</span>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Pilih Tampilan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ringkasan">Ringkasan</SelectItem>
                  <SelectItem value="penerimaan">Statistik Penerimaan</SelectItem>
                  <SelectItem value="distribusi">Statistik Distribusi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
              <span className="text-sm font-semibold">Tahun:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

        {viewMode === 'penerimaan' && <PenerimaanStats selectedYear={selectedYear} />}
        {viewMode === 'distribusi' && <DistribusiStats selectedYear={selectedYear} />}
        
        {viewMode === 'ringkasan' && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Total Muzakki</CardTitle>
              <div className="bg-primary/10 p-2 rounded-full">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{data?.overview?.total_muzakki || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Terdaftar aktif tahun {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Total Mustahiq</CardTitle>
              <div className="bg-indigo-500/10 p-2 rounded-full">
                <UserCheck className="h-4 w-4 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{data?.overview?.total_mustahiq || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Terdaftar aktif tahun {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Total Penerimaan</CardTitle>
              <div className="bg-emerald-500/10 p-2 rounded-full">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(data?.overview?.total_penerimaan || 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Total dana masuk tahun {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Total Penyaluran</CardTitle>
              <div className="bg-orange-500/10 p-2 rounded-full">
                <ArrowDownRight className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(data?.overview?.total_distribusi || 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2 font-medium">
              </p>
            </CardContent>
          </Card>
        </div>
      </>
      )}
    </div>
    </DashboardLayout>
  );
}
