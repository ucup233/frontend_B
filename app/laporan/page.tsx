'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle, Loader2, Printer, X,
  FileText, BarChart2, TrendingUp, CalendarDays, Users, BookOpen, Wallet
} from 'lucide-react';
import { laporanApi } from '@/lib/api';
import { exportLaporanDocx } from '@/lib/docx-export';
import { exportMustahiqIndividuExcel, exportMustahiqLembagaExcel, exportPenerimaanZisExcel, exportDistribusiExcel } from '@/lib/xlsx-export';
import { toast } from 'sonner';

type DateMode = 'single' | 'range';

interface ReportType {
  value: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  dateMode: DateMode;
  dateLabel?: string;
}

const REPORT_GROUPS: { group: string; reports: ReportType[] }[] = [
  {
    group: 'Laporan Keuangan',
    reports: [
      {
        value: 'perubahan_dana',
        label: 'Neraca & Laporan Perubahan Dana',
        description: 'Ringkasan posisi keuangan (Aktiva & Pasiva) dan perubahan saldo dana ZIS',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
        dateMode: 'single',
        dateLabel: 'Per Tanggal (YTD)',
      },
      {
        value: 'kas_masuk_harian',
        label: 'Kas Masuk Harian',
        description: 'Laporan penerimaan (kas masuk) pada satu tanggal tertentu',
        icon: Wallet,
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-500',
        dateMode: 'single' as DateMode,
        dateLabel: 'Tanggal',
      },
    ],
  },
  {
    group: 'Kas Keluar',
    reports: [
      {
        value: 'kas_keluar_program',
        label: 'Kas Keluar – Program',
        description: 'Rekapitulasi penyaluran berdasarkan program kegiatan',
        icon: BookOpen,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        dateMode: 'range',
      },
      {
        value: 'kas_keluar_asnaf',
        label: 'Kas Keluar – Asnaf',
        description: 'Rekapitulasi penyaluran berdasarkan kategori asnaf',
        icon: Users,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-500',
        dateMode: 'range',
      },
      {
        value: 'kas_keluar_harian',
        label: 'Kas Keluar – Harian',
        description: 'Rincian penyaluran untuk satu tanggal tertentu',
        icon: CalendarDays,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-500',
        dateMode: 'single',
        dateLabel: 'Tanggal',
      },
    ],
  },
  {
    group: 'Export Data',
    reports: [
      {
        value: 'distribusi',
        label: 'Data Distribusi (Word)',
        description: 'Export data distribusi dalam format dokumen',
        icon: BarChart2,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-500',
        dateMode: 'range',
      },
      {
        value: 'pengumpulan',
        label: 'Data Pengumpulan (Word)',
        description: 'Export data penerimaan dalam format dokumen',
        icon: FileText,
        color: 'text-teal-600',
        bg: 'bg-teal-50',
        border: 'border-teal-500',
        dateMode: 'range',
      },
      {
        value: 'penerimaan_zis_excel',
        label: 'Data Penerimaan ZIS (Excel)',
        description: 'Export rekap data penerimaan ZIS dengan rincian per kategori dana',
        icon: FileText,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
        dateMode: 'range',
      },
      {
        value: 'distribusi_excel',
        label: 'Data Pendistribusian (Excel)',
        description: 'Export seluruh data pendistribusian dengan rincian asnaf',
        icon: FileText,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        dateMode: 'range',
      },
      {
        value: 'mustahiq_individu',
        label: 'Mustahiq Perorangan (Excel)',
        description: 'Export seluruh data mustahiq kategori individu / perorangan',
        icon: Users,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        dateMode: 'range',
      },
      {
        value: 'mustahiq_lembaga',
        label: 'Mustahiq Lembaga & Masjid (Excel)',
        description: 'Export seluruh data mustahiq kategori Lembaga dan Masjid',
        icon: Users,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-500',
        dateMode: 'range',
      },
    ],
  },
];

const ALL_REPORTS: ReportType[] = REPORT_GROUPS.flatMap(g => g.reports);

export default function LaporanPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const getLocalYMD = (date: Date) =>
    date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

  const [popupReport, setPopupReport] = useState<ReportType | null>(null);
  const [tanggalMulai, setTanggalMulai] = useState(getLocalYMD(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [tanggalAkhir, setTanggalAkhir] = useState(getLocalYMD(today));
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupReport(null);
      }
    };
    if (popupReport) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [popupReport]);

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const isRange = popupReport?.dateMode === 'range';

  const handleExport = async () => {
    if (!popupReport) return;
    setIsLoading(true);
    setError(null);

    try {
      const startParam = isRange ? tanggalMulai : tanggalAkhir;
      const endParam = tanggalAkhir;

      if (popupReport.value === 'mustahiq_individu') {
        try {
          await exportMustahiqIndividuExcel(startParam, endParam);
        } catch (err: any) {
          toast.error(err.message || 'Tidak ada data mustahiq perorangan di rentang tanggal ini');
        }
        setPopupReport(null);
        setIsLoading(false);
        return;
      }

      if (popupReport.value === 'mustahiq_lembaga') {
        try {
          await exportMustahiqLembagaExcel(startParam, endParam);
        } catch (err: any) {
          toast.error(err.message || 'Tidak ada data mustahiq lembaga/masjid di rentang tanggal ini');
        }
        setPopupReport(null);
        setIsLoading(false);
        return;
      }

      if (popupReport.value === 'penerimaan_zis_excel') {
        try {
          await exportPenerimaanZisExcel(startParam, endParam);
        } catch (err: any) {
          toast.error(err.message || 'Tidak ada data penerimaan ZIS di rentang tanggal ini');
        }
        setPopupReport(null);
        setIsLoading(false);
        return;
      }

      if (popupReport.value === 'distribusi_excel') {
        try {
          await exportDistribusiExcel(startParam, endParam);
        } catch (err: any) {
          toast.error(err.message || 'Tidak ada data pendistribusian di rentang tanggal ini');
        }
        setPopupReport(null);
        setIsLoading(false);
        return;
      }

      if (['kas_keluar_program', 'kas_keluar_asnaf', 'kas_keluar_harian', 'perubahan_dana', 'kas_masuk_harian'].includes(popupReport.value)) {
        let path = '/laporan/print';
        if (popupReport.value === 'perubahan_dana') path = '/laporan/perubahan-dana';
        if (popupReport.value === 'kas_masuk_harian') path = '/laporan/kas-masuk';

        // For perubahan_dana: always pass Jan 1 of the selected year as start
        // so the backend knows the full-year context
        let startForUrl = startParam;
        if (popupReport.value === 'perubahan_dana') {
          const selYear = new Date(endParam).getFullYear();
          startForUrl = `${selYear}-01-01`;
        }

        let url = `${path}?start_date=${startForUrl}&end_date=${endParam}&jenis_data=${popupReport.value}`;


        window.open(url, '_blank');
        setPopupReport(null);
        setIsLoading(false);
        return;
      }

      // Word export for distribusi / pengumpulan using real data
      await exportLaporanDocx({
        tanggalMulai: startParam,
        tanggalAkhir: endParam,
        jenisData: popupReport.value, // 'distribusi' | 'pengumpulan'
      });
      setPopupReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor laporan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Laporan &amp; Export</h1>
          <p className="text-muted-foreground mt-1">Klik jenis laporan untuk memilih tanggal dan cetak PDF</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Grouped Report Cards */}
        <div className="space-y-6">
          {REPORT_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {group.group}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.reports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <button
                      key={report.value}
                      onClick={() => setPopupReport(report)}
                      className="text-left rounded-xl border-2 border-gray-200 bg-white p-4 
                        transition-all duration-150 hover:shadow-md hover:border-gray-300 focus:outline-none active:scale-[0.98]"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${report.bg} shrink-0`}>
                          <Icon className={`h-4 w-4 ${report.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{report.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{report.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popup Modal */}
      {popupReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div
            ref={popupRef}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Popup Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${popupReport.bg}`}>
                  <popupReport.icon className={`h-4 w-4 ${popupReport.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{popupReport.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRange ? 'Pilih rentang tanggal' : `Pilih ${popupReport.dateLabel || 'tanggal'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPopupReport(null)}
                className="text-muted-foreground hover:text-foreground transition-colors ml-2 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Date Inputs */}
            <div className="space-y-3 mb-5">
              {isRange && (
                <div className="space-y-1.5">
                  <Label htmlFor="popup-mulai" className="text-xs">Tanggal Mulai</Label>
                  <Input
                    id="popup-mulai"
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="popup-akhir" className="text-xs">
                  {isRange ? 'Tanggal Akhir' : (popupReport.dateLabel || 'Tanggal')}
                </Label>
                <Input
                  id="popup-akhir"
                  type="date"
                  value={tanggalAkhir}
                  onChange={(e) => setTanggalAkhir(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Action */}
            <Button onClick={handleExport} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak PDF
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
