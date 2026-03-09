'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { penerimaanApi, apiFetch } from '@/lib/api';
import { Loader2, Download } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

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

export default function CetakBuktiSetoranPage() {
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
                const res = await penerimaanApi.get(id);
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

    // Fetch daily sequence number after data loads
    useEffect(() => {
        if (!data?.id) return;
        apiFetch(`/api/penerimaan/${data.id}/daily-seq`)
            .then((res: any) => setDailySeq(res.seq ?? null))
            .catch(() => setDailySeq(null));
    }, [data]);

    const handleDownloadPdf = async () => {
        const element = document.getElementById('pdf-content');
        if (!element) return;

        const html2pdf = (await import('html2pdf.js')).default;

        // Auto-generate meaningful filename
        const tglData = data?.tanggal ? new Date(data.tanggal) : new Date();
        const tglStr = `${String(tglData.getDate()).padStart(2, '0')}-${String(tglData.getMonth() + 1).padStart(2, '0')}-${tglData.getFullYear()}`;
        const jenisZisLabel = (data?.zis?.nama || data?.jenis_zis || 'ZIS').replace(/\s+/g, '-');
        const muzakkilabel = (data?.Muzakki?.nama || data?.nama_muzakki || 'Muzakki').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const filename = `BuktiSetoran_${jenisZisLabel}_${muzakkilabel}_${tglStr}.pdf`;

        const opt = {
            margin: 0,
            filename,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc: Document) => {
                    // Do NOT remove all stylesheets, as it kills Tailwind/global styles.
                    // Only remove problematic styles if absolutely necessary.
                    // Most modern versions of html2canvas/html2pdf handle OKLCH better now,
                    // but we keep the specific problematic removal only.
                    clonedDoc.querySelectorAll('style').forEach(el => {
                        if (el.textContent?.includes('oklch') || el.textContent?.includes(' lab(')) {
                            // Instead of removing, we can try to commented out problematic lines 
                            // but removing is safer if they are specific to Radix/etc.
                            // However, let's try keep everything first.
                        }
                    });
                }
            },
            jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' as const },
            pagebreak: { mode: 'css', before: '.print-page-break' }
        };

        html2pdf().set(opt).from(element).save();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Menyiapkan Kuitansi...</span>
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

    // Determine type (Zakat or Infak)
    const isZakat = (data?.zis?.nama || '').toLowerCase().includes('zakat');
    const title = isZakat ? 'Bukti Setoran Zakat' : 'Bukti Setoran Infak/Sedekah';
    const objZis = isZakat ? 'Zakat' : 'Infak / Sedekah';
    const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tgl = new Date(data.tanggal);
    const periode = `${bulanArr[tgl.getMonth()]} ${tgl.getFullYear()}`;

    // Formatting date DD/MM/YYYY
    const dd = String(tgl.getDate()).padStart(2, '0');
    const mm = String(tgl.getMonth() + 1).padStart(2, '0');
    const yyyy = tgl.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    const namaMuzakki = data.Muzakki?.nama || data.muzakki?.nama || data.nama_muzakki || '-';

    const terbilangNum = Number(data.jumlah) || 0;
    const terbilangStr = terbilang(terbilangNum);
    const capitalizedTerbilang = terbilangStr.charAt(0).toUpperCase() + terbilangStr.slice(1);

    const pages = [
        { label: '1', arsip: isZakat ? 'Untuk Arsip Wajib Zakat' : 'Untuk Arsip BAZNAS' },
        { label: '2', arsip: 'Untuk Arsip BAZNAS' }
    ];

    // Receipt number: [1=individu,2=entitas/UPZ]/DD/MM/YY/km/[daily_seq]
    const yy = String(tgl.getFullYear()).slice(-2);
    const jenisUPZ = data.JenisUpz?.nama || data.jenis_upz?.nama || '';
    const isEntitas = jenisUPZ && !jenisUPZ.toLowerCase().includes('individu');
    const typeDigit = isEntitas ? '2' : '1';
    const seqStr = dailySeq !== null ? String(dailySeq).padStart(4, '0') : '????';
    const receiptNo = `${dd}/${mm}/${yy}/km/${typeDigit}/${seqStr}`;

    return (
        <div className="print-container bg-white text-black min-h-screen">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A5 portrait; 
                        margin: 0; 
                    }
                    body { 
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                        padding: 0;
                        margin: 0;
                        background: white;
                    }
                    .print-page-break { page-break-before: always; }
                    .no-print { display: none !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        max-width: 100% !important; 
                        width: 148mm !important;
                        height: 210mm !important;
                    }
                }
                body { background-color: #525659; } 
                .print-container { 
                    width: 148mm; 
                    height: 210mm;
                    margin: 20px auto; 
                    padding: 8mm; 
                    background: white; 
                    box-shadow: 0 0 10px rgba(0,0,0,0.5); 
                    position: relative; 
                    box-sizing: border-box;
                }
                
                table { width: 100%; border-collapse: collapse; font-size: 9pt; }
                th, td { border: 1px solid black; padding: 4px 6px; text-align: left; }
                .table-no-border td { border: none; padding: 3px 5px; }
            `}} />

            <div className="no-print mb-4 p-4 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 rounded flex flex-row items-center justify-between gap-3 sticky top-0 z-50 shadow-sm">
                <p>
                    <strong>Bukti Setoran Siap.</strong> Anda dapat mencetak atau menyimpan kuitansi ini.
                </p>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPdf} className="bg-emerald-600 font-medium text-white px-5 py-2.5 rounded shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap">
                        <Download className="h-4 w-4" /> Simpan PDF
                    </button>
                    <button onClick={() => window.print()} className="bg-blue-600 font-medium text-white px-5 py-2.5 rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap">
                        Cetak Printer
                    </button>
                </div>
            </div>

            <div id="pdf-content">
                {pages.map((pageConf, index) => (
                    <div key={index} className={`w-full border border-black p-0 ${index > 0 ? 'print-page-break mt-8' : ''}`} style={{ minHeight: '14cm' }}>

                        {/* Header Box */}
                        <div className="flex w-full border-b border-black">
                            {/* Logo */}
                            <div className="w-1/3 flex flex-col items-center justify-center p-0 border-r border-black font-sans">
                                <img src="/logo.png" alt="BAZNAS Logo" className="w-24 h-24 mb-1 object-contain" />
                                <div className="text-center font-bold text-[10pt] text-emerald-800 leading-tight">
                                    Kota Batam
                                </div>
                            </div>
                            {/* Center Info */}
                            <div className="w-1/3 flex flex-col items-center justify-center p-4 border-r border-black text-center text-sm leading-tight">
                                <div className="font-bold mb-2">BADAN AMIL ZAKAT NASIONAL<br />Kota Batam</div>
                                <div>Graha Kadin Blok C No.8 Jl.Engku<br />putri Batam Center</div>
                                <div className="mt-4">Whatsapp: 082170795757</div>
                            </div>
                            {/* Right Lembar */}
                            <div className="w-1/3 flex flex-col items-center justify-center p-4 font-bold">
                                <div className="flex items-center gap-4 mb-4">
                                    <span>Lembar</span>
                                    <div className="border-2 border-black w-12 h-16 flex items-center justify-center text-3xl">
                                        {pageConf.label}
                                    </div>
                                </div>
                                <div className="text-sm font-normal text-center">{index === 0 ? (isZakat ? 'Untuk Arsip Wajib Zakat' : 'Untuk Arsip Wajib Zakat') : 'Untuk Arsip BAZNAS'}</div>
                            </div>
                        </div>

                        {/* Title Box */}
                        <div className="w-full text-center border-b border-black py-2 bg-gray-50">
                            <h2 className="font-bold text-xl">{title}</h2>
                        </div>

                        {/* Detail Transaksi (Nomor & Periode) */}
                        <div className="w-full p-4 border-b border-black text-sm">
                            <table className="table-no-border w-[50%]">
                                <tbody>
                                    <tr>
                                        <td className="w-32 py-1">Nomor</td>
                                        <td className="font-mono">: {receiptNo}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-32 py-1">Periode</td>
                                        <td>: {periode}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Bio Muzakki */}
                        <div className="w-full p-4 border-b border-black text-sm font-mono leading-relaxed tracking-tight">
                            <table className="table-no-border w-full">
                                <tbody>
                                    <tr>
                                        <td className="w-40 py-1">Telah terima dari</td>
                                        <td>: {namaMuzakki}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-40 py-1">NPWZ</td>
                                        <td>: {(data.Muzakki?.npwz || data.muzakki?.npwz) || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-40 py-1">NPWP/NIK</td>
                                        <td>: {`${data.Muzakki?.npwp || data.muzakki?.npwp || ''} / ${data.Muzakki?.nik || data.muzakki?.nik || ''}`}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-40 py-1 align-top">Alamat</td>
                                        <td className="break-words">: {(data.Muzakki?.alamat || data.muzakki?.alamat) || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-40 py-1">Telepon</td>
                                        <td>: {(data.Muzakki?.no_hp || data.muzakki?.no_hp) || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Item Table */}
                        <table className="w-full border-b border-black text-sm font-mono text-center">
                            <thead>
                                <tr>
                                    <th className="w-1/4 p-2">Objek ZIS</th>
                                    <th className="w-1/3 p-2">Uraian</th>
                                    <th className="w-1/4 p-2">Via</th>
                                    <th className="p-2 border-r-0">Jumlah (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-3 text-left w-1/4 align-top">{objZis}</td>
                                    <td className="p-3 text-left w-1/3 align-top break-words">
                                        Penerimaan | {data.Zis?.nama || data.zis?.nama} | {data.JenisZis?.nama || data.jenis_zis?.nama} | {data.JenisMuzakki?.nama || data.jenis_muzakki?.nama || 'Kas'}
                                    </td>
                                    <td className="p-3 text-left w-1/4 align-top break-words">
                                        {`${data.MetodeBayar?.nama || data.metode_bayar?.nama || ''} ${data.no_rekening || ''}`.trim()} | {data.ViaPenerimaan?.nama || data.via?.nama || ''} Zakat
                                    </td>
                                    <td className="p-3 text-right align-top border-r-0">
                                        {(Number(data.jumlah) || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Terbilang */}
                        <div className="w-full p-4 border-b border-black text-sm font-mono flex items-start gap-2">
                            <span className="font-bold whitespace-nowrap">Terbilang :</span>
                            <span>{capitalizedTerbilang} rupiah</span>
                        </div>

                        {/* Catatan */}
                        <div className="w-full p-4 border-b border-black text-sm font-mono min-h-[60px]">
                            <strong>Catatan : </strong> {data.keterangan || ''}
                        </div>

                        {/* Doa */}
                        <div className="w-full p-3 border-b border-black text-center text-sm">
                            Semoga Allah SWT memberikan pahala kepada Bapak/Ibu <strong>{namaMuzakki}</strong> atas harta yang telah dikeluarkan dan menjadi berkah dan suci atas harta yang lainnya.
                        </div>

                        {/* TTD Box */}
                        <div className="flex w-full min-h-[140px]">
                            {/* Kiri (Petugas Amil) */}
                            <div className="w-1/2 border-r border-black p-4 flex flex-col justify-between items-center relative">
                                <div className="text-center w-full">
                                    <div>Pengesahan Petugas Amil</div>
                                    <div className="mt-2 font-mono flex items-center justify-center gap-4">
                                        <span>Batam</span>
                                        <span>Tgl {formattedDate}</span>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between font-mono mt-12 text-sm">
                                    <span>Petugas :</span>
                                    <span className="text-right">{user?.nama || user?.username || data.User?.nama || data.user?.nama || 'Petugas'}</span>
                                </div>
                            </div>

                            {/* Kanan (Penyetor) */}
                            <div className="w-1/2 p-4 flex flex-col justify-between items-center">
                                <div className="text-center w-full">
                                    <div>Penyetor / Wajib Zakat</div>
                                    <div className="mt-2 font-mono flex items-center justify-center gap-4">
                                        <span>Batam</span>
                                        <span>Tgl {formattedDate}</span>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between font-mono mt-16 text-sm">
                                    <span>Nama :</span>
                                    <span className="text-right">{namaMuzakki}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                ))}

                {/* PDF Footnotes */}
                <div className="w-full text-[8px] mt-2 leading-tight px-1 font-sans text-gray-700">
                    * BAZNAS Kota Batam memberikan Bukti Setoran Zakat sesuai dengan Pasal 23 ayat (1) Undang-Undang No. 23 tahun 2011.<br />
                    ** Bukti Setoran Zakat dapat digunakan sebagai pengurang penghasilan kena pajak sesuai dengan Pasal 23 ayat (2) UU No. 23 tahun 2011.<br />
                    *** BAZNAS Kota Batam hanya menerima dana dari sumber yang halal, tidak bertentangan dengan syariah, peraturan yang berlaku, dan tidak termasuk Tindak Pidana Pencucian Uang.
                </div>
            </div>
        </div>
    );
}
