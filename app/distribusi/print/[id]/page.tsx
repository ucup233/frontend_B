'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { distribusiApi, apiFetch } from '@/lib/api';
import { Loader2, Printer, Download } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

// Utility for Terbilang (Number to Words in Indonesian)
function terbilang(angka: number): string {
    const bilangan = [
        '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'
    ];
    let result = '';

    if (angka < 12) {
        result = bilangan[angka];
    } else if (angka < 20) {
        result = terbilang(angka - 10) + ' belas';
    } else if (angka < 100) {
        result = terbilang(Math.floor(angka / 10)) + ' puluh ' + terbilang(angka % 10);
    } else if (angka < 200) {
        result = 'seratus ' + terbilang(angka - 100);
    } else if (angka < 1000) {
        result = terbilang(Math.floor(angka / 100)) + ' ratus ' + terbilang(angka % 100);
    } else if (angka < 2000) {
        result = 'seribu ' + terbilang(angka - 1000);
    } else if (angka < 1000000) {
        result = terbilang(Math.floor(angka / 1000)) + ' ribu ' + terbilang(angka % 1000);
    } else if (angka < 1000000000) {
        result = terbilang(Math.floor(angka / 1000000)) + ' juta ' + terbilang(angka % 1000000);
    } else if (angka < 1000000000000) {
        result = terbilang(Math.floor(angka / 1000000000)) + ' miliar ' + terbilang(angka % 1000000000);
    } else {
        result = 'Angka terlalu besar';
    }

    return result.trim();
}

export default function CetakKuitansiDistribusiPage() {
    const params = useParams();
    const id = Number(params?.id);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dailySeq, setDailySeq] = useState<number | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!id) {
            setError('ID tidak ditemukan');
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const res = await distribusiApi.get(id);
                if (res.data) {
                    setData(res.data);
                } else {
                    throw new Error('Data tidak ditemukan');
                }
            } catch (err: any) {
                setError(err.message || 'Gagal mengambil data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Fetch daily sequence after data loads
    useEffect(() => {
        if (!data?.id) return;
        apiFetch(`/api/distribusi/${data.id}/daily-seq`)
            .then((res: any) => setDailySeq(res.seq ?? null))
            .catch(() => setDailySeq(null));
    }, [data]);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('kuitansi-content');
        if (!element) return;

        const html2pdf = (await import('html2pdf.js')).default;

        // Auto-generate meaningful filename from available data
        const tglData = data?.tanggal ? new Date(data.tanggal) : new Date();
        const tglStr = `${String(tglData.getDate()).padStart(2, '0')}-${String(tglData.getMonth() + 1).padStart(2, '0')}-${tglData.getFullYear()}`;
        const mustahiqName = (data?.Mustahiq?.nama || data?.nama_mustahik || 'Mustahiq').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const filename = `KuitansiDistribusi_${mustahiqName}_${tglStr}.pdf`;

        const opt = {
            margin: 0,
            filename,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc: Document) => {
                    // Remove stylesheets with oklch/lab that html2canvas can't parse
                    clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
                    clonedDoc.querySelectorAll('style').forEach(el => {
                        if (el.textContent?.includes('oklch') || el.textContent?.includes(' lab(')) {
                            el.remove();
                        }
                    });
                }
            },
            jsPDF: { unit: 'mm', format: [210, 148] as [number, number], orientation: 'landscape' as const },
        };

        html2pdf().set(opt).from(element).save();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#3B4CA8]" />
                <span className="ml-2 text-[#3B4CA8] font-medium">Menyesuaikan Kuitansi...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center text-red-500 font-bold">
                Error: {error || 'Data kosong'}
            </div>
        );
    }

    const tgl = data.tanggal ? new Date(data.tanggal) : new Date();

    // Formatting date DD/MM/YYYY
    const dd = String(tgl.getDate()).padStart(2, '0');
    const mm = String(tgl.getMonth() + 1).padStart(2, '0');
    const yy = String(tgl.getFullYear()).slice(-2);
    const yyyy = tgl.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    // Receipt number: [1=individu,2=lembaga/masjid]/DD/MM/YY/kk/[daily_seq]
    const kategoriMustahiq = data.ref_kategori_mustahiq?.nama || data.KategoriMustahiq?.nama || '';
    const isLembaga = kategoriMustahiq && !kategoriMustahiq.toLowerCase().includes('individu');
    const typeDigitD = isLembaga ? '2' : '1';
    const seqStrD = dailySeq !== null ? String(dailySeq).padStart(4, '0') : '????';
    const receiptNo = `${dd}/${mm}/${yy}/kk/${typeDigitD}/${seqStrD}`;

    const namaMustahiq = data.Mustahiq?.nama || data.nama_mustahik || '-';
    // Append NRM if available and requested, the image shows it might just be the name or name + location.
    // Let's just use the Mustahiq Name and add the description or program if we want.
    const mustahiqLabel = `${namaMustahiq}`;

    const terbilangNum = Number(data.jumlah) || 0;
    const terbilangStr = terbilang(terbilangNum);
    const capitalizedTerbilang = terbilangStr.charAt(0).toUpperCase() + terbilangStr.slice(1);

    // Keterangan / Detail Program
    const prog = data.NamaProgram?.nama || data.ref_nama_program?.nama || data.nama_program?.nama || data.nama_program || '';
    const subProg = data.SubProgram?.nama || data.ref_sub_program?.nama || data.sub_program?.nama || data.sub_program || '';
    const keg = data.ProgramKegiatan?.nama || data.ref_program_kegiatan?.nama || data.program_kegiatan?.nama || data.program_kegiatan || '';
    const desc = data.keterangan ? `(${data.keterangan})` : '';
    const paymentFor = `Penyaluran | ${prog} | ${subProg} | ${keg} ${desc}`.replace(/\|\s*\|/g, '|').replace(/\|\s*$/g, '');

    const bendaharaName = user?.nama || user?.username || 'Arthafika Haryana'; // Fallback to example if empty

    const copies = [
        { label: 'Untuk Penerima' },
        { label: 'Untuk BAZNAS' }
    ];

    return (
        <div className="print-container bg-gray-50 text-black min-h-screen relative flex flex-col items-center py-4 gap-8">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A5 landscape; 
                        margin: 0; 
                    }
                    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                    .no-print { display: none !important; }
                    .print-container { background: white; min-h-0; padding: 0; display: block; gap: 0; }
                    .page-a5 { border: none !important; margin: 0 !important; width: 210mm; height: 148mm; box-shadow: none !important; page-break-after: always; }
                    .page-a5:last-child { page-break-after: auto; }
                }
                `
            }} />

            {/* Print Controls */}
            <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
                <Button onClick={handleDownloadPdf} variant="outline" className="shadow-md border-[#3B4CA8] text-[#3B4CA8] hover:bg-[#3B4CA8] hover:text-white">
                    <Download className="mr-2 h-4 w-4" /> Simpan PDF
                </Button>
                <Button onClick={() => window.print()} className="shadow-md bg-[#3B4CA8] hover:bg-[#2A377D]">
                    <Printer className="mr-2 h-4 w-4" /> Cetak Printer (A5 Landscape)
                </Button>
            </div>

            <div id="kuitansi-content" className="flex flex-col items-center gap-8 w-full">

                {copies.map((copy, index) => (
                    <div key={index} className="page-a5 bg-white w-[210mm] h-[148mm] border shadow-lg relative mx-auto box-border flex flex-col p-[8mm] text-[#2A377D] overflow-hidden shrink-0">
                        <div className="border-[1.5px] border-[#3B4CA8] h-full flex flex-col relative p-4 overflow-hidden">

                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 shrink-0">
                                <div className="w-48 relative h-16">
                                    <Image src="/logo.png" alt="BAZNAS Logo" fill className="object-contain object-left" />
                                </div>
                                <div className="flex-1 flex justify-center items-center pt-4">
                                    <div className="text-2xl font-bold underline underline-offset-4 decoration-[#3B4CA8]">KUITANSI</div>
                                </div>
                                <div className="border border-[#3B4CA8] px-3 py-1.5 mt-2">
                                    <span className="font-semibold mr-2 text-sm">No:</span>
                                    <span className="font-mono text-sm">{receiptNo}</span>
                                </div>
                            </div>

                            <div className="border-b-[1.5px] border-[#3B4CA8] w-[calc(100%+2rem)] -ml-4 mb-4 shrink-0"></div>

                            {/* Content */}
                            <div className="flex-1 min-h-0 flex flex-col gap-4 text-[13px] overflow-hidden">

                                {/* Row 1: Paid To */}
                                <div className="flex items-start gap-4 shrink-0">
                                    <div className="w-40 shrink-0 leading-tight">
                                        <div className="font-semibold">Dibayarkan Kepada</div>
                                        <div className="italic font-bold text-[#3B4CA8]">paid to</div>
                                    </div>
                                    <div className="font-bold mr-2">:</div>
                                    <div className="flex-1 border-b border-[#3B4CA8] pb-1 font-semibold text-black tracking-wide truncate">
                                        {mustahiqLabel}
                                    </div>
                                </div>

                                {/* Row 2: Amount (Words) */}
                                <div className="flex items-start gap-4 shrink-0">
                                    <div className="w-40 shrink-0 leading-tight">
                                        <div className="font-semibold">Jumlah</div>
                                        <div className="italic font-bold text-[#3B4CA8]">amount</div>
                                    </div>
                                    <div className="font-bold mr-2">:</div>
                                    <div className="flex-1 bg-gray-300 px-3 py-1.5 font-bold italic text-black tracking-wide truncate">
                                        {capitalizedTerbilang} rupiah
                                    </div>
                                </div>

                                {/* Row 3: Payment For */}
                                <div className="flex items-start gap-4 flex-1 min-h-0">
                                    <div className="w-40 shrink-0 leading-tight">
                                        <div className="font-semibold">Untuk pembayaran</div>
                                        <div className="italic font-bold text-[#3B4CA8]">payment for</div>
                                    </div>
                                    <div className="font-bold mr-2">:</div>
                                    <div className="flex-1 text-black font-semibold leading-relaxed relative flex flex-col overflow-hidden h-full">
                                        <div className="border-b border-[#3B4CA8] whitespace-pre-wrap">{paymentFor}</div>
                                        <div className="border-b border-[#3B4CA8] h-6 w-full block shrink-0 mt-1"></div>
                                    </div>
                                </div>

                                {/* Row 4: Numeric Amount & Date */}
                                <div className="flex items-end justify-between mt-2 shrink-0">
                                    <div className="flex items-center gap-4 w-1/2">
                                        <div className="italic font-bold text-[#3B4CA8] text-lg w-10">Rp</div>
                                        <div className="bg-gray-300 px-8 py-1.5 font-bold text-black tracking-widest text-lg min-w-[200px] text-center">
                                            {terbilangNum.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <div className="flex items-end text-black font-bold text-sm">
                                        <div className="w-40 border-b border-[#3B4CA8]"></div>
                                        <span>, {formattedDate}</span>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Sigs */}
                            <div className="mt-4 shrink-0 flex justify-between items-end text-xs">
                                <div className="w-64 leading-tight">
                                    <div className="font-bold text-[#3B4CA8]">BADAN AMIL ZAKAT NASIONAL</div>
                                    <div className="font-bold text-[#3B4CA8]">Kota Batam</div>
                                    <div className="text-[#3B4CA8]">Graha Kadin Blok C No.8 Jl.Engku putri Batam</div>
                                    <div className="text-[#3B4CA8]">Telp. 0778477504 Fax.</div>
                                </div>

                                <div className="flex gap-16 justify-end text-center flex-1">
                                    <div className="w-48 text-black">
                                        <div className="font-bold border-b border-black pb-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {mustahiqLabel.length > 25 ? "Pimpinan Daerah" : mustahiqLabel}
                                        </div>
                                        <div className="text-[#3B4CA8]">Penerima</div>
                                    </div>

                                    <div className="w-48 text-black">
                                        <div className="font-bold border-b border-black pb-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {bendaharaName}
                                        </div>
                                        <div className="text-[#3B4CA8]">Bendahara/Kasir</div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Edge */}
                            <div className="mt-auto shrink-0 w-[calc(100%+2rem)] -ml-4 pt-4">
                                <div className="border-t-[1.5px] border-[#3B4CA8] pt-2 px-4 flex justify-between text-[11px] italic font-medium">
                                    <div>http://kotabatam.baznas.go.id</div>
                                    <div>{copy.label}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>{/* end kuitansi-content */}
        </div>
    );
}
