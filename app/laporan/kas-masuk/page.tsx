'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { laporanApi } from '@/lib/api';
import { Loader2, Download, Printer } from 'lucide-react';

function KasMasukContent() {
    const searchParams = useSearchParams();
    const tanggal = searchParams.get('end_date') || searchParams.get('tanggal') || '';

    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tanggal) { setError('Parameter tanggal tidak ditemukan'); setIsLoading(false); return; }
        const doFetch = async () => {
            try {
                const res = await laporanApi.getKasMasukHarian({ tanggal });
                if (res.success) setData(res.data);
                else throw new Error(res.message || 'Gagal mengambil data');
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        doFetch();
    }, [tanggal]);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('pdf-content');
        if (!element) return;
        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().set({
            margin: 15,
            filename: `Laporan-Kas-Masuk-${tanggal}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc: Document) => {
                    // Remove stylesheets containing oklch/lab that html2canvas can't parse
                    clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
                    clonedDoc.querySelectorAll('style').forEach(el => {
                        if (el.textContent?.includes('oklch') || el.textContent?.includes(' lab(')) {
                            el.remove();
                        }
                    });
                }
            },
            jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const },
        }).from(element).save();
    };

    if (isLoading) return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Menyiapkan Laporan...</span>
        </div>
    );
    if (error) return (
        <div className="flex h-screen items-center justify-center text-red-500 font-bold">Error: {error}</div>
    );
    if (!data) return null;

    const items: any[] = data.items || [];
    const summary = data.summary || {};
    const totalDonasi = items.reduce((acc, row) => acc + (row.donasi || 0), 0);
    const totalNonDonasi = items.reduce((acc, row) => acc + (row.non_donasi || 0), 0);
    const fmt = (v: any) => (parseFloat(v || 0)).toLocaleString('id-ID');

    return (
        <div className="print-container bg-white text-black min-h-screen">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; padding: 15mm; padding-bottom: 25mm; }
                    .print-page-break { page-break-before: always; }
                    .no-print { display: none !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    body { counter-reset: page; }
                    .page-number::after { counter-increment: page; content: "Page " counter(page); }
                }
                body { background-color: #f3f4f6; }
                .print-container { max-width: 210mm; margin: 0 auto; padding: 20mm; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); min-height: 297mm; position: relative; }
                @media print { .print-container { box-shadow: none; margin: 0; padding: 0; max-width: 100%; min-height: auto; } }
                table { width: 100%; border-collapse: collapse; margin-block: 1rem; font-size: 9pt; }
                th, td { border: 1px solid black; padding: 5px 7px; text-align: left; }
                th { font-weight: bold; text-align: center; background-color: #e5e7eb; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
            `}} />

            {/* Standardized Sticky Header */}
            <div className="no-print mb-4 p-4 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 rounded flex flex-row items-center justify-between gap-3 sticky top-0 z-50 shadow-sm">
                <p>
                    <strong>Laporan Siap.</strong> Anda dapat mencetak laporan ini.
                </p>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-blue-600 font-medium text-white px-5 py-2.5 rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap">
                        <Printer className="h-4 w-4" /> Cetak Printer
                    </button>
                    <button onClick={() => window.close()} className="bg-white border border-gray-300 font-medium text-gray-700 px-5 py-2.5 rounded shadow-sm hover:bg-gray-50 transition-colors whitespace-nowrap">
                        Tutup
                    </button>
                </div>
            </div>

            <div id="pdf-content">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="font-bold text-2xl uppercase">BAZNAS Kota Batam</div>
                    <div className="font-bold text-xl mt-2">Laporan Kas Masuk</div>
                    <div className="font-bold text-lg">(001/SIO-LAP)</div>
                    <div className="font-bold text-lg mt-1">{data.dateLabel}</div>
                </div>

                {/* Transaction Table */}
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>No</th>
                            <th style={{ width: '25%' }}>NPWZ</th>
                            <th style={{ width: '40%' }}>Nama</th>
                            <th style={{ width: '15%' }}>Donasi (Rp)</th>
                            <th style={{ width: '15%' }}>Non Donasi (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((row: any) => (
                            <tr key={row.no}>
                                <td className="text-center">{row.no}</td>
                                <td>{row.npwz}</td>
                                <td>{row.nama}</td>
                                <td className="text-right">{row.donasi > 0 ? fmt(row.donasi) : ''}</td>
                                <td className="text-right">{row.non_donasi > 0 ? fmt(row.non_donasi) : ''}</td>
                            </tr>
                        ))}
                        {/* Jumlah row */}
                        <tr>
                            <td colSpan={3} className="text-right font-bold">Jumlah (Rp)</td>
                            <td className="text-right font-bold">{totalDonasi > 0 ? fmt(totalDonasi) : '0'}</td>
                            <td className="text-right font-bold">{totalNonDonasi > 0 ? fmt(totalNonDonasi) : '0'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Summary */}
                <div className="mt-6" style={{ width: '50%' }}>
                    <table>
                        <tbody>
                            {[
                                { label: 'Penerimaan Tunai', value: summary.tunai },
                                { label: 'Penerimaan Bank',  value: summary.bank },
                                { label: 'Penerimaan Lain',  value: summary.lain },
                            ].map(({ label, value }) => (
                                <tr key={label}>
                                    <td style={{ border: 'none' }} className="font-bold">{label}</td>
                                    <td style={{ border: 'none', width: '20px' }} className="font-bold">Rp</td>
                                    <td style={{ border: 'none' }} className="text-right font-bold">{fmt(value)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td style={{ borderTop: '1px solid black', borderBottom: '1px solid black', borderLeft: 'none', borderRight: 'none' }} className="font-bold">Penerimaan Total</td>
                                <td style={{ borderTop: '1px solid black', borderBottom: '1px solid black', borderLeft: 'none', borderRight: 'none' }} className="font-bold">Rp</td>
                                <td style={{ borderTop: '1px solid black', borderBottom: '1px solid black', borderLeft: 'none', borderRight: 'none' }} className="text-right font-bold">{fmt(summary.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signature */}
                <div className="mt-16 flex justify-end">
                    <div className="text-center" style={{ width: '300px' }}>
                        <div className="mb-2">{data.signatureDate}</div>
                        <div className="font-bold mb-24">Petugas Konter</div>
                        <div className="font-bold uppercase">(________________________)</div>
                    </div>
                </div>
            </div>

            {/* Print page number footer */}
            <div className="fixed bottom-0 left-0 right-0 text-center pb-4 text-sm hidden print:block border-t border-black pt-2 mx-6">
                <span className="page-number italic"></span>
            </div>
        </div>
    );
}

export default function KasMasukPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Memuat...</span>
            </div>
        }>
            <KasMasukContent />
        </Suspense>
    );
}
