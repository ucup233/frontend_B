'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuthToken, laporanApi } from '@/lib/api';
import { Loader2, Download, Printer } from 'lucide-react';

function LaporanPrintContent() {
    const searchParams = useSearchParams();
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const jenisData = searchParams.get('jenis_data');

    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!startDate || !endDate || !jenisData) {
            setError('Parameter tidak lengkap');
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                let res: any;
                if (jenisData === 'kas_keluar_program') {
                    res = await laporanApi.getDistribusiByProgram({ start_date: startDate, end_date: endDate });
                } else if (jenisData === 'kas_keluar_asnaf') {
                    res = await laporanApi.getDistribusiByAsnaf({ start_date: startDate, end_date: endDate });
                } else if (jenisData === 'kas_keluar_harian') {
                    res = await laporanApi.getDistribusiHarian({ start_date: startDate, end_date: endDate });
                }

                if (res) {
                    if (res.success) setData(res.data);
                    else throw new Error(res.message || 'Gagal mengambil data');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate, jenisData]);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('pdf-content');
        if (!element) return;

        // Dynamically import html2pdf to avoid SSR issues
        const html2pdf = (await import('html2pdf.js')).default;

        const opt = {
            margin: 15,
            filename: `Laporan-Kas-Keluar-${jenisData}-${endDate}.pdf`,
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
            pagebreak: { mode: 'css' as const, before: '.print-page-break' }
        };

        html2pdf().set(opt).from(element).save();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Menyiapkan Laporan...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center text-red-500 font-bold">
                Error: {error}
            </div>
        );
    }

    // Grouping logic for Program and Asnaf
    const groups: Record<string, any[]> = {};
    if (jenisData !== 'kas_keluar_harian') {
        data.forEach(item => {
            let gName = 'Lainnya';
            if (jenisData === 'kas_keluar_program') {
                const pk = item.ref_program_kegiatan?.nama || '';
                const sp = item.ref_sub_program?.nama || '';
                const np = item.ref_nama_program?.nama || '';
                gName = `${item.ref_program_kegiatan?.kode || ''} | ${np} | ${sp} | ${pk}`;
            } else if (jenisData === 'kas_keluar_asnaf') {
                gName = item.asnaf?.nama || item.ref_asnaf?.nama || 'Tanpa Asnaf';
            }
            if (!groups[gName]) groups[gName] = [];
            groups[gName].push(item);
        });
    }

    const titleHarian = `Hari ${new Date(startDate!).toLocaleDateString('id-ID', { weekday: 'long' })} Tanggal ${new Date(startDate!).toLocaleDateString('id-ID')}\n(002/SIO-LAP)`;

    return (
        <div className="print-container bg-white text-black min-h-screen">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    body { 
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                        font-size: 10pt; 
                        padding: 15mm;
                        padding-bottom: 25mm;
                    }
                    .print-page-break { page-break-before: always; }
                    .no-print { display: none !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }\n                @page {
                    size: A4 portrait;
                    margin: 15mm 10mm 20mm 10mm;
                    @bottom-center {
                        content: 'Halaman ' counter(page) ' dari ' counter(pages);
                        font-size: 9pt;
                        font-family: sans-serif;
                    }
                }
                body { background-color: #f3f4f6; } /* gray background for screen */
                .print-container { max-width: 210mm; margin: 0 auto; padding: 20mm; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); min-height: 297mm; position: relative; }
                @media print { .print-container { box-shadow: none; margin: 0; padding: 0; max-width: 100%; min-height: auto; } }
                table { width: 100%; border-collapse: collapse; margin-block: 1rem; font-size: 9pt; }
                th, td { border: 1px solid black; padding: 6px 8px; text-align: left; }
                th { font-weight: bold; text-align: center; background-color: #e5e7eb; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mt-4 { margin-top: 1rem; }
                .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                .text-2xl { font-size: 1.5rem; line-height: 2rem; }
                .uppercase { text-transform: uppercase; }
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
                {jenisData === 'kas_keluar_harian' ? (
                    // Laman Harian
                    <div>
                        <div className="text-center mb-4">
                            <div className="font-bold text-2xl uppercase">BAZNAS Kota Batam</div>
                            <div className="font-bold text-xl uppercase mt-2">LAPORAN KAS KELUAR</div>
                            {titleHarian.split('\n').map((line, i) => (
                                <div key={i} className="font-bold text-lg">{line}</div>
                            ))}
                        </div>

                        <table className="mt-4">
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}>No</th>
                                    <th style={{ width: '20%' }}>NRM / No Trans</th>
                                    <th style={{ width: '30%' }}>Nama</th>
                                    <th style={{ width: '22.5%' }}>Penyaluran Dana (Rp)</th>
                                    <th style={{ width: '22.5%' }}>Penggunaan Dana (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td>{item.nrm || '-'}</td>
                                        <td>{item.nama_mustahik || item.ref_nama_entita?.nama || '-'}</td>
                                        <td className="text-right">{(Number(item.jumlah) || 0).toLocaleString('id-ID')}</td>
                                        <td></td>
                                    </tr>
                                ))}
                                {/* Saldo Subtotal Harian */}
                                <tr>
                                    <td colSpan={3} className="text-right font-bold">Jumlah (Rp)</td>
                                    <td className="text-right font-bold">{data.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0).toLocaleString('id-ID')}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mt-8" style={{ width: '50%' }}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td style={{ border: 'none' }} className="font-bold">Pengeluaran Tunai</td>
                                        <td style={{ border: 'none', width: '10px' }} className="font-bold">Rp</td>
                                        <td style={{ border: 'none' }} className="text-right font-bold">{data.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: 'none' }} className="font-bold">Pengeluaran Lain</td>
                                        <td style={{ border: 'none', width: '10px' }} className="font-bold">Rp</td>
                                        <td style={{ border: 'none' }} className="text-right font-bold">0</td>
                                    </tr>
                                    <tr>
                                        <td style={{ borderTop: '1px solid black', borderBottom: '1px solid black', borderLeft: 'none', borderRight: 'none' }} className="font-bold">Pengeluaran Total</td>
                                        <td style={{ borderTop: '1px solid black', borderBottom: '1px solid black', borderLeft: 'none', borderRight: 'none' }} className="font-bold">Rp</td>
                                        <td style={{ borderTop: '1px solid black', borderBottom: '1px solid black', borderLeft: 'none', borderRight: 'none' }} className="text-right font-bold">{data.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    // Laman per Program/Asnaf
                    Object.entries(groups).map(([groupName, items], index) => {
                        let kode = '';
                        let nama = groupName;

                        if (jenisData === 'kas_keluar_program') {
                            const parts = groupName.split(' | ');
                            kode = parts[0];
                            nama = parts.slice(1).join(' | ');
                        }

                        return (
                            <div key={groupName} className={index > 0 ? 'print-page-break' : ''}>
                                {/* Repeating Header per Page Break */}
                                <div className="text-center mb-4">
                                    <div className="font-bold text-2xl uppercase">BAZNAS Kota Batam</div>
                                    <div className="font-bold text-xl uppercase mt-2">LAPORAN KAS KELUAR</div>
                                    <div className="font-bold text-lg">
                                        {jenisData === 'kas_keluar_program' ? 'Berdasarkan Program Kegiatan\n(701/SIO-LAP)' : 'Berdasarkan ASHNAF\n(702/SIO-LAP)'}
                                    </div>
                                    <div className="font-bold text-lg mt-2">
                                        {new Date(startDate!).toLocaleDateString('id-ID')} s/d {new Date(endDate!).toLocaleDateString('id-ID')}
                                    </div>
                                </div>

                                <div className="mt-8 mb-4">
                                    {jenisData === 'kas_keluar_program' ? (
                                        <>
                                            <div className="font-bold text-lg mb-1">Kode   : {kode}</div>
                                            <div className="font-bold text-lg mb-2">Nama   : {nama}</div>
                                        </>
                                    ) : (
                                        <div className="font-bold text-lg mb-2">{nama}</div>
                                    )}
                                </div>

                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '5%' }}>No</th>
                                            <th style={{ width: '12%' }}>Tanggal</th>
                                            <th style={{ width: '15%' }}>NRM</th>
                                            <th style={{ width: '28%' }}>Nama</th>
                                            <th style={{ width: '25%' }}>Alamat</th>
                                            <th style={{ width: '15%' }}>Jumlah</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={item.id || idx}>
                                                <td className="text-center">{idx + 1}</td>
                                                <td className="text-center">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                                <td>{item.nrm || '-'}</td>
                                                <td>{item.nama_mustahik || '-'}</td>
                                                <td>{item.alamat || '-'}</td>
                                                <td className="text-right">{(Number(item.jumlah) || 0).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={5} className="text-center font-bold">Total</td>
                                            <td className="text-right font-bold">{items.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        );
                    })
                )}

                {/* Single Signature Block at the End of Everything */}
                <div className="mt-16 flex justify-end page-break-inside-avoid">
                    <div className="text-center" style={{ width: '300px' }}>
                        <div className="mb-2">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        <div className="font-bold mb-24">Petugas Konter,</div>
                        <div className="font-bold uppercase">(HEMNAWIR DORISNA SIREGAR)</div>
                    </div>
                </div>
            </div>

            {/* Print Footer for Page Numbers (Only visible in browser print) */}
            <div className="fixed bottom-0 left-0 right-0 text-center pb-4 text-sm hidden print:block border-t border-black pt-2 mx-6">
                <span className="page-number italic"></span>
            </div>
        </div>
    );
}

export default function LaporanPrintPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Memuat parameter...</span>
            </div>
        }>
            <LaporanPrintContent />
        </Suspense>
    );
}
