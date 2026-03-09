'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { distribusiApi, dashboardApi } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowUpRight, Loader2, BarChart3, PieChart as PieChartIcon, MapPin, Briefcase, HeartHandshake, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';

const MONTHS = [
  { val: 'all', label: 'Semua Bulan' },
  { val: 'Januari', label: 'Januari' },
  { val: 'Februari', label: 'Februari' },
  { val: 'Maret', label: 'Maret' },
  { val: 'April', label: 'April' },
  { val: 'Mei', label: 'Mei' },
  { val: 'Juni', label: 'Juni' },
  { val: 'Juli', label: 'Juli' },
  { val: 'Agustus', label: 'Agustus' },
  { val: 'September', label: 'September' },
  { val: 'Oktober', label: 'Oktober' },
  { val: 'November', label: 'November' },
  { val: 'Desember', label: 'Desember' },
];

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#0ea5e9', '#f43f5e'];

export function DistribusiStats({ selectedYear }: { selectedYear: string }) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { tahun: parseInt(selectedYear) };
      if (selectedMonth !== 'all') params.bulan = selectedMonth;

      const [res, resUtama] = await Promise.all([
        distribusiApi.getStats(params),
        dashboardApi.getUtama(params)
      ]);
      
      if (res.success) {
        setData({
          ...res.data,
          overview: resUtama?.data?.overview || {}
        });
      }
    } catch (err) {
      toast.error('Gagal memuat data statistik distribusi');
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

  const renderPieChart = (stats: any[], title: string) => {
    if (!stats || stats.length === 0) {
      return (
        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed">
          <PieChartIcon className="h-10 w-10 mb-2 opacity-20" />
          <p className="italic text-sm">Tidak ada data {title} untuk periode ini</p>
        </div>
      );
    }

    return (
      <div className="h-[450px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stats}
            margin={{ top: 30, right: 30, left: 40, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="category"
              type="category"
              tick={{ fontSize: 11, fontWeight: 500 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: any) => formatCurrency(Number(value))}
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
              {stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                dataKey="total"
                position="top"
                formatter={(val: number) => formatCurrency(val)}
                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#666' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderBarChart = (stats: any[], title: string) => {
    if (!stats || stats.length === 0) {
      return (
        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed">
          <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
          <p className="italic text-sm">Tidak ada data {title} untuk periode ini</p>
        </div>
      );
    }

    return (
      <div className="h-[450px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stats}
            margin={{ top: 30, right: 30, left: 40, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="category"
              type="category"
              tick={{ fontSize: 11, fontWeight: 500 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              formatter={(value: any) => formatCurrency(Number(value))}
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}>
              {stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                dataKey="total"
                position="top"
                formatter={(val: number) => formatCurrency(val)}
                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#666' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            Statistik Pendistribusian
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Analisis penyaluran dana ZIS berdasarkan Asnaf, Program, dan Wilayah.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-border">
          <span className="text-sm font-bold text-muted-foreground ml-2">Bulan:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] font-medium border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden relative group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all" />
          <CardContent className="p-6 relative">
            <p className="text-primary-foreground/80 font-medium mb-1 text-sm">Total Distribusi ZIS</p>
            <h3 className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(data?.summary?.total_distribusi_zis || 0)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="h-3 w-3" />
              <span>Seluruh Program</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-600 text-white shadow-lg border-none overflow-hidden relative group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all" />
          <CardContent className="p-6 relative">
            <p className="text-white/80 font-medium mb-1 text-sm">Total Distribusi Zakat</p>
            <h3 className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(data?.summary?.total_distribusi_zakat || 0)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 w-fit px-2 py-1 rounded-full">
              <HeartHandshake className="h-3 w-3" />
              <span>Dana Zakat</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500 text-white shadow-lg border-none overflow-hidden relative group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all" />
          <CardContent className="p-6 relative">
            <p className="text-white/80 font-medium mb-1 text-sm">Total Distribusi Infak</p>
            <h3 className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(data?.summary?.total_distribusi_infaq || 0)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 w-fit px-2 py-1 rounded-full">
              <Briefcase className="h-3 w-3" />
              <span>Dana Infak/Sedekah</span>
            </div>
          </CardContent>
        </Card>

        {/* Menunggu Persetujuan Card */}
        <Card className="border-l-4 shadow-lg border-l-red-500 hover:shadow-md transition-all hover:scale-[1.02] bg-white">
          <CardContent className="p-6 h-full flex flex-col justify-center">
            <div className="flex justify-between items-start mb-2">
              <p className="text-red-600 font-bold mb-1 text-sm">Menunggu Persetujuan</p>
              <div className="bg-red-500/10 p-2 rounded-full">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-red-500" /> : (data?.overview?.total_distribusi_menunggu || 0)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs bg-red-50 text-red-600 font-medium w-fit px-2 py-1 rounded-full">
              <span>Permohonan perlu diproses</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Tabs */}
      <Card className="shadow-xl border-none ring-1 ring-border">
        <CardHeader className="border-b bg-muted/5 pb-0">
          <Tabs defaultValue="asnaf" className="w-full">
            <TabsList className="flex w-full overflow-x-auto bg-transparent border-none gap-2 p-1 no-scrollbar justify-start">
              <TabsTrigger value="asnaf" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 rounded-full font-bold transition-all">
                <PieChartIcon className="h-4 w-4 mr-2" /> Berdasarkan Asnaf
              </TabsTrigger>
              <TabsTrigger value="program" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 rounded-full font-bold transition-all">
                <Briefcase className="h-4 w-4 mr-2" /> Berdasarkan Program
              </TabsTrigger>
              <TabsTrigger value="kecamatan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 rounded-full font-bold transition-all">
                <MapPin className="h-4 w-4 mr-2" /> Berdasarkan Kecamatan
              </TabsTrigger>
              <TabsTrigger value="kelurahan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 rounded-full font-bold transition-all">
                <MapPin className="h-4 w-4 mr-2" /> Berdasarkan Kelurahan
              </TabsTrigger>
            </TabsList>

            <div className="pt-8 pb-6 px-4 md:px-6">
              <TabsContent value="asnaf" className="mt-0 focus-visible:outline-none">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-primary">Proporsi Berdasarkan Asnaf</h3>
                  <p className="text-sm text-muted-foreground mt-1">Distribusi dana zakat kepada 8 golongan asnaf.</p>
                </div>
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>
                ) : renderPieChart(data?.by_asnaf, 'Asnaf')}
              </TabsContent>

              <TabsContent value="program" className="mt-0 focus-visible:outline-none">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-primary">Distribusi Per Program BAZNAS</h3>
                  <p className="text-sm text-muted-foreground mt-1">Capaian penyaluran melalui program utama (Batam Sehat, Cerdas, dsb.)</p>
                </div>
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>
                ) : renderBarChart(data?.by_program, 'Program')}
              </TabsContent>

              <TabsContent value="kecamatan" className="mt-0 focus-visible:outline-none">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-primary">Wilayah Penerima Manfaat</h3>
                  <p className="text-sm text-muted-foreground mt-1">Kecamatan yang paling sering dibantu dan total penyalurannya.</p>
                </div>
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>
                ) : (
                  <div className="space-y-6">
                    {renderBarChart(data?.by_kecamatan, 'Kecamatan')}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                      {data?.by_kecamatan?.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{item.category}</p>
                            <p className="text-xs text-muted-foreground">{item.jumlah_mustahiq} Mustahiq dibantu</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-sm text-primary">{formatCurrency(item.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="kelurahan" className="mt-0 focus-visible:outline-none">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-primary">Kelurahan Penerima Manfaat</h3>
                  <p className="text-sm text-muted-foreground mt-1">Top 20 kelurahan yang paling sering dibantu dan total penyalurannya.</p>
                </div>
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>
                ) : (
                  <div className="space-y-6">
                    {renderBarChart(data?.by_kelurahan, 'Kelurahan')}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                      {data?.by_kelurahan?.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{item.category}</p>
                            <p className="text-xs text-muted-foreground">{item.jumlah_mustahiq} Mustahiq dibantu</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-sm text-emerald-600">{formatCurrency(item.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
