'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { laporanApi } from '@/lib/api';
import { Loader2, Printer, Download } from 'lucide-react';

function PerubahanDanaContent() {
    const searchParams = useSearchParams();
    const endDate = searchParams.get('end_date') || searchParams.get('start_date');

    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        let bulan = '';
        let tahun = 0;
        let end_date = '';

        if (endDate && endDate.includes('-')) {
            const d = new Date(endDate + 'T00:00:00');
            tahun = d.getFullYear();
            bulan = bulanList[d.getMonth()];
            end_date = endDate;
        } else {
            const date = new Date();
            tahun = date.getFullYear();
            bulan = bulanList[date.getMonth()];
            end_date = date.toISOString().slice(0, 10);
        }

        const fetchData = async () => {
            try {
                const res = await laporanApi.getPerubahanDana({ bulan, tahun, tanggal: end_date });
                if (res.success) {
                    setData(res.data);
                } else {
                    throw new Error(res.message || 'Gagal mengambil data');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [endDate]);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('pdf-content');
        if (!element) return;
        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `Laporan-Perubahan-Dana-${data?.periode || ''}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc: Document) => {
                    clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
                    clonedDoc.querySelectorAll('style').forEach(el => {
                        if (el.textContent?.includes('oklch') || el.textContent?.includes(' lab(')) {
                            el.remove();
                        }
                    });
                }
            },
            jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const },
            pagebreak: { mode: ['css', 'legacy'] as any, before: '.page-break' }
        } as any).from(element).save();
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

    const { current, previous, labels, periode } = data;

    // Dynamic signature date from the endDate
    const signatureDate = (() => {
        const d = endDate ? new Date(endDate + 'T00:00:00') : new Date();
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    })();

    const formatCurrency = (val: any) => {
        return new Intl.NumberFormat('id-ID').format(parseFloat(val || 0));
    };

    const DataRow = ({ label, acc, curr, prev, isBold = false, pl = 0, topBorder = false, bottomBorder = false, doubleBottomBorder = false }: any) => (
        <div className={`grid grid-cols-12 gap-2 text-xs py-0.5 ${isBold ? 'font-bold' : ''}`}>
            <div className={`col-span-6 ${pl ? `pl-${pl}` : ''}`}>{label}</div>
            <div className="col-span-2 text-center">{acc}</div>
            <div className={`col-span-2 text-right ${topBorder ? 'border-t border-black' : ''} ${bottomBorder ? 'border-b border-black' : ''} ${doubleBottomBorder ? 'border-b-4 border-double border-black pb-0.5' : ''}`}>{formatCurrency(curr)}</div>
            <div className={`col-span-2 text-right ${topBorder ? 'border-t border-black' : ''} ${bottomBorder ? 'border-b border-black' : ''} ${doubleBottomBorder ? 'border-b-4 border-double border-black pb-0.5' : ''}`}>{formatCurrency(prev)}</div>
        </div>
    );

    const renderHeader = () => (
        <div className="text-left mb-3">
            <h1 className="font-bold text-base uppercase">BAZNAS KOTA BATAM</h1>
            <h2 className="font-bold text-sm uppercase">LAPORAN PERUBAHAN DANA (UNAUDITED)</h2>
            <p className="font-medium text-sm">Per {periode}</p>
            <p className="text-xs italic font-serif">(Dinyatakan dalam Rupiah Penuh)</p>
            <div className="h-[1.5px] bg-black mt-1 mb-2"></div>
            <div className="grid grid-cols-12 gap-2 font-bold mb-2 text-xs">
                <div className="col-span-6"></div>
                <div className="col-span-2 text-center border-b border-black">Acc. No.</div>
                <div className="col-span-2 text-center border-b border-black">{labels.tahun_current}</div>
                <div className="col-span-2 text-center border-b border-black">{labels.tahun_previous}</div>
            </div>
        </div>
    );

    const renderSignatures = (namesMt: string = 'mt-50', dateMt: string = 'mt-12') => (
        <>
            {/* Tanggal & PIMPINAN di atas sendiri */}
            <div className={`${dateMt} text-center text-xs font-bold`}>
                <p>{signatureDate}</p>
                <p>PIMPINAN</p>
            </div>
            {/* Grid nama tanda tangan terpisah */}
            <div className={`${namesMt} grid grid-cols-3 gap-4`}>
                <div className="text-center text-xs">
                    <div className="h-8"></div>
                    <p className="font-bold border-b border-black inline-block tracking-widest px-4">Habib Soleh, M.Pd.I.</p>
                    <p>Ketua</p>
                </div>
                <div></div>
                <div className="text-center text-xs">
                    <div className="h-8"></div>
                    <p className="font-bold border-b border-black inline-block px-4">Achmad Fahmi, S.T.</p>
                    <p>Wakil Ketua Bidang Keuangan</p>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <style dangerouslySetInnerHTML={{ __html: `
                @page {
                    size: A4 portrait;
                    margin: 0;
                }
                @media print {
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .section-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 12mm 12mm 10mm 12mm !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .page-break {
                        break-before: page !important;
                        page-break-before: always !important;
                    }
                }
            `}} />

            {/* Sticky toolbar */}
            <div className="no-print sticky top-0 z-50 mb-4 p-4 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 rounded flex flex-row items-center justify-between gap-3 shadow-sm">
                <p><strong>Laporan Siap.</strong> Anda dapat mencetak laporan ini.</p>
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
                {/* ─── PAGE 1: DANA ZAKAT ─── */}
                <div className="section-page bg-white shadow-xl mx-auto p-12 mb-6" style={{ maxWidth: '210mm' }}>
                    {renderHeader()}

                    <div className="font-bold text-lg mb-4">DANA ZAKAT</div>

                    <div className="mb-6">
                        <div className="font-bold mb-2">Penerimaan Dana</div>
                        <DataRow label="Penerimaan | Zakat | Entitas" acc="4101" curr={current.zakat.penerimaan.entitas} prev={previous.zakat.penerimaan.entitas} pl={4} />
                        <DataRow label="Penerimaan | Zakat | Individual" acc="4102" curr={current.zakat.penerimaan.individual} prev={previous.zakat.penerimaan.individual} pl={4} />
                        <DataRow label="Penerimaan | Zakat | Bagi Hasil atas..." acc="4103" curr={0} prev={0} pl={4} />
                        <DataRow label="Penerimaan | Zakat | Dampak Pengukuran" acc="4104" curr={0} prev={0} pl={4} />
                        <DataRow label="Penerimaan | Zakat | Hasil Penjualan/Laba" acc="4105" curr={0} prev={0} pl={4} />
                        <DataRow label="Penerimaan | Zakat | Lainnya" acc="4199" curr={current.zakat.penerimaan.lainnya} prev={previous.zakat.penerimaan.lainnya} pl={4} />
                        <div className="mt-2">
                            <DataRow label="Jumlah Penerimaan BAZNAS" acc="" curr={current.zakat.total_penerimaan} prev={previous.zakat.total_penerimaan} isBold={true} topBorder={true} bottomBorder={true} />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="font-bold mb-2">Penyaluran Dana</div>
                        <DataRow label="Penyaluran | Zakat | Amil" acc="5101" curr={current.zakat.penyaluran.amil} prev={previous.zakat.penyaluran.amil} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Fakir" acc="5102" curr={current.zakat.penyaluran.fakir} prev={previous.zakat.penyaluran.fakir} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Miskin" acc="5103" curr={current.zakat.penyaluran.miskin} prev={previous.zakat.penyaluran.miskin} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Riqab" acc="5104" curr={current.zakat.penyaluran.riqob} prev={previous.zakat.penyaluran.riqob} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Gharimin" acc="5105" curr={current.zakat.penyaluran.gharimin} prev={previous.zakat.penyaluran.gharimin} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Muallaf" acc="5106" curr={current.zakat.penyaluran.muallaf} prev={previous.zakat.penyaluran.muallaf} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Sabilillah" acc="5107" curr={current.zakat.penyaluran.fisabilillah} prev={previous.zakat.penyaluran.fisabilillah} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Ibnu Sabil" acc="5108" curr={current.zakat.penyaluran.ibnu_sabil} prev={previous.zakat.penyaluran.ibnu_sabil} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Alokasi Pemanfaatan" acc="5109" curr={0} prev={0} pl={4} />
                        <DataRow label="Penyaluran | Zakat | Lainnya" acc="5199" curr={current.zakat.penyaluran.lainnya} prev={previous.zakat.penyaluran.lainnya} pl={4} />
                        <div className="mt-2">
                            <DataRow label="Jumlah Penyaluran" acc="" curr={current.zakat.total_penyaluran} prev={previous.zakat.total_penyaluran} isBold={true} topBorder={true} bottomBorder={true} />
                        </div>
                    </div>

                    <div className="mt-6">
                        <DataRow label="Surplus (Defisit)" acc="" curr={current.zakat.surplus} prev={previous.zakat.surplus} isBold={true} />
                        <div className="h-2"></div>
                        <DataRow label="Saldo Dana Zakat Awal Periode" acc="" curr={current.zakat.saldo_awal} prev={previous.zakat.saldo_awal} isBold={true} />
                        <div className="h-2"></div>
                        <div className="mt-1">
                            <DataRow label="Saldo Dana Zakat Akhir Periode" acc="" curr={current.zakat.saldo_akhir} prev={previous.zakat.saldo_akhir} isBold={true} topBorder={true} doubleBottomBorder={true} />
                        </div>
                    </div>

                    {renderSignatures("mt-30")}
                    <div className="border-t border-gray-300 mt-6"></div>
                </div>

                {/* ─── PAGE 2: DANA INFAK ─── */}
                <div className="section-page page-break bg-white shadow-xl mx-auto p-12 mb-6" style={{ maxWidth: '210mm' }}>
                    {renderHeader()}

                    <div className="font-bold text-lg mb-4">DANA INFAK</div>

                    <div className="mb-6">
                        <div className="font-bold mb-2">Penerimaan Dana</div>
                        <DataRow label="Penerimaan | Infak dan Sedekah | Terikat" acc="4201" curr={current.infak.penerimaan.terikat} prev={previous.infak.penerimaan.terikat} pl={4} />
                        <DataRow label="Penerimaan | Infak dan Sedekah | Tidak" acc="4202" curr={current.infak.penerimaan.tidak_terikat} prev={previous.infak.penerimaan.tidak_terikat} pl={4} />
                        <DataRow label="Penerimaan | Infak dan Sedekah | Bagi Hasil" acc="4203" curr={current.infak.penerimaan.bagi_hasil} prev={previous.infak.penerimaan.bagi_hasil} pl={4} />
                        <DataRow label="Penerimaan | Infak dan Sedekah | Dampak" acc="4204" curr={current.infak.penerimaan.dampak} prev={previous.infak.penerimaan.dampak} pl={4} />
                        <DataRow label="Penerimaan | Infak dan Sedekah | Hasil" acc="4205" curr={current.infak.penerimaan.hasil} prev={previous.infak.penerimaan.hasil} pl={4} />
                        <DataRow label="Penerimaan | Infak dan Sedekah | Lainnya" acc="4299" curr={current.infak.penerimaan.lainnya} prev={previous.infak.penerimaan.lainnya} pl={4} />
                        <div className="mt-2">
                            <DataRow label="Jumlah Penerimaan" acc="" curr={current.infak.total_penerimaan} prev={previous.infak.total_penerimaan} isBold={true} topBorder={true} bottomBorder={true} />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="font-bold mb-2">Penyaluran Dana</div>
                        <DataRow label="Penyaluran | Infak dan Sedekah | Amil-Infak" acc="5201" curr={current.infak.penyaluran.amil_infak} prev={previous.infak.penyaluran.amil_infak} pl={4} />
                        <DataRow label="Penyaluran | Infak dan Sedekah | Amil-Sedekah" acc="5202" curr={current.infak.penyaluran.amil_sedekah} prev={previous.infak.penyaluran.amil_sedekah} pl={4} />
                        <DataRow label="Penyaluran | Infak dan Sedekah | Terikat" acc="5203" curr={current.infak.penyaluran.terikat} prev={previous.infak.penyaluran.terikat} pl={4} />
                        <DataRow label="Penyaluran | Infak dan Sedekah | Tidak" acc="5204" curr={current.infak.penyaluran.tidak_terikat} prev={previous.infak.penyaluran.tidak_terikat} pl={4} />
                        <DataRow label="Penyaluran | Infak dan Sedekah | Alokasi" acc="5205" curr={current.infak.penyaluran.alokasi} prev={previous.infak.penyaluran.alokasi} pl={4} />
                        <DataRow label="Penyaluran | Infak dan Sedekah | Lainnya" acc="5299" curr={current.infak.penyaluran.lainnya} prev={previous.infak.penyaluran.lainnya} pl={4} />
                        <div className="mt-2">
                            <DataRow label="Jumlah Penyaluran" acc="" curr={current.infak.total_penyaluran} prev={previous.infak.total_penyaluran} isBold={true} topBorder={true} bottomBorder={true} />
                        </div>
                    </div>

                    <div className="mt-6">
                        <DataRow label="Surplus (Defisit)" acc="" curr={current.infak.surplus} prev={previous.infak.surplus} isBold={true} />
                        <div className="h-2"></div>
                        <DataRow label="Saldo Dana Infak Awal Periode" acc="" curr={current.infak.saldo_awal} prev={previous.infak.saldo_awal} isBold={true} />
                        <div className="h-2"></div>
                        <div className="mt-1">
                            <DataRow label="Saldo Dana Infak Akhir Periode" acc="" curr={current.infak.saldo_akhir} prev={previous.infak.saldo_akhir} isBold={true} topBorder={true} doubleBottomBorder={true} />
                        </div>
                    </div>

                    {renderSignatures('mt-50')}
                    <div className="border-t border-gray-300 mt-6"></div>
                </div>

                {/* ─── PAGE 3: DANA AMIL ─── */}
                <div className="section-page page-break bg-white shadow-xl mx-auto p-12 mb-6" style={{ maxWidth: '210mm' }}>
                    {renderHeader()}

                    <div className="font-bold text-lg mb-4">DANA AMIL</div>

                    <div className="mb-6">
                        <div className="font-bold mb-2">Penerimaan Dana</div>
                        <DataRow label="Penerimaan | Amil | Bagian dari Zakat" acc="4301" curr={current.amil?.penerimaan?.bagian_dari_zakat} prev={previous.amil?.penerimaan?.bagian_dari_zakat} pl={4} />
                        <DataRow label="Penerimaan | Amil | Bagian dari Infak dan Sedekah" acc="4302" curr={current.amil?.penerimaan?.bagian_dari_infak} prev={previous.amil?.penerimaan?.bagian_dari_infak} pl={4} />
                        <DataRow label="Penerimaan | Amil | Infak dan Sedekah" acc="4303" curr={current.amil?.penerimaan?.infak_sedekah} prev={previous.amil?.penerimaan?.infak_sedekah} pl={4} />
                        <DataRow label="Penerimaan | Amil | Bagi Hasil" acc="4304" curr={current.amil?.penerimaan?.bagi_hasil} prev={previous.amil?.penerimaan?.bagi_hasil} pl={4} />
                        <DataRow label="Penerimaan | Amil | Lainnya" acc="4399" curr={current.amil?.penerimaan?.lainnya} prev={previous.amil?.penerimaan?.lainnya} pl={4} />
                        <div className="mt-2">
                            <DataRow label="Jumlah Penerimaan" acc="" curr={current.amil?.total_penerimaan} prev={previous.amil?.total_penerimaan} isBold={true} topBorder={true} bottomBorder={true} />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="font-bold mb-2">Penyaluran Dana</div>
                        <DataRow label="Penyaluran | Amil | Belanja Pegawai" acc="5301" curr={current.amil?.penyaluran?.belanja_pegawai} prev={previous.amil?.penyaluran?.belanja_pegawai} pl={4} />
                        <DataRow label="Penyaluran | Amil | Belanja Kegiatan" acc="5302" curr={current.amil?.penyaluran?.belanja_kegiatan} prev={previous.amil?.penyaluran?.belanja_kegiatan} pl={4} />
                        <DataRow label="Penyaluran | Amil | Belanja Perjalanan Dinas" acc="5303" curr={current.amil?.penyaluran?.perjalanan_dinas} prev={previous.amil?.penyaluran?.perjalanan_dinas} pl={4} />
                        <DataRow label="Penyaluran | Amil | Belanja Administrasi" acc="5304" curr={current.amil?.penyaluran?.belanja_administrasi} prev={previous.amil?.penyaluran?.belanja_administrasi} pl={4} />
                        <DataRow label="Penyaluran | Amil | Beban Pengadaan" acc="5305" curr={current.amil?.penyaluran?.beban_pengadaan} prev={previous.amil?.penyaluran?.beban_pengadaan} pl={4} />
                        <DataRow label="Penyaluran | Amil | Beban Penyusutan" acc="5306" curr={current.amil?.penyaluran?.beban_penyusutan} prev={previous.amil?.penyaluran?.beban_penyusutan} pl={4} />
                        <DataRow label="Penyaluran | Amil | Belanja Jasa Pihak Ketiga" acc="5307" curr={current.amil?.penyaluran?.jasa_pihak_ketiga} prev={previous.amil?.penyaluran?.jasa_pihak_ketiga} pl={4} />
                        <DataRow label="Penyaluran | Amil | Operasional UPZ" acc="5308" curr={current.amil?.penyaluran?.operasional_upz} prev={previous.amil?.penyaluran?.operasional_upz} pl={4} />
                        <DataRow label="Penyaluran | Amil | Lainnya" acc="5399" curr={current.amil?.penyaluran?.lainnya} prev={previous.amil?.penyaluran?.lainnya} pl={4} />
                        <div className="mt-2">
                            <DataRow label="Jumlah Penyaluran" acc="" curr={current.amil?.total_penyaluran} prev={previous.amil?.total_penyaluran} isBold={true} topBorder={true} bottomBorder={true} />
                        </div>
                    </div>

                    <div className="mt-6">
                        <DataRow label="Surplus (Defisit)" acc="" curr={current.amil?.surplus} prev={previous.amil?.surplus} isBold={true} />
                        <div className="h-2"></div>
                        <DataRow label="Saldo Dana Amil Awal Periode" acc="" curr={current.amil?.saldo_awal} prev={previous.amil?.saldo_awal} isBold={true} />
                        <div className="h-2"></div>
                        <div className="mt-1">
                            <DataRow label="Saldo Dana Amil Akhir Periode" acc="" curr={current.amil?.saldo_akhir} prev={previous.amil?.saldo_akhir} isBold={true} topBorder={true} doubleBottomBorder={true} />
                        </div>
                    </div>

                    {renderSignatures('mt-40')}
                    <div className="border-t border-gray-300 mt-6"></div>
                </div>
            </div>
        </div>
    );
}

export default function LaporanPerubahanDanaPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Memuat parameter...</span>
            </div>
        }>
            <PerubahanDanaContent />
        </Suspense>
    );
}
