import * as XLSX from 'xlsx';
import { mustahiqApi, penerimaanApi, distribusiApi } from './api';

export const exportMustahiqIndividuExcel = async (startDate?: string, endDate?: string) => {
    try {
        // Fetch all mustahiq data where kategori_mustahiq_id = 1 (Individu)
        const payload: any = { kategori_mustahiq_id: 1, limit: 9999, page: 1 };
        if (startDate) payload.start_date = startDate;
        if (endDate) payload.end_date = endDate;

        const res = await mustahiqApi.list(payload) as any;

        let rows = [];
        if (res && res.data && Array.isArray(res.data)) {
            rows = res.data;
        } else if (res && res.rows && Array.isArray(res.rows)) {
            rows = res.rows;
        } else if (Array.isArray(res)) {
            rows = res;
        }

        console.log('[Export Mustahiq] fetched individu rows:', rows?.length);

        if (!rows || rows.length === 0) {
            throw new Error('Tidak ada data mustahiq individu yang ditemukan.');
        }

        const formatDate = (dateString: string) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        const excelData = rows.map((r: any) => ({
            'Tanggal Registrasi': formatDate(r.registered_date),
            'Nama Lengkap': r.nama || '',
            'NIK': r.nik || '',
            'Tanggal Lahir': formatDate(r.tgl_lahir),
            'Jenis Kelamin': r.jenis_kelamin === 'Laki-laki' ? 'Pria' : r.jenis_kelamin === 'Perempuan' ? 'Wanita' : '',
            'Alamat': r.alamat || '',
            'No Handphone': r.no_hp || '',
            'Keterangan': r.keterangan || '',
        }));

        // Convert mapped data to worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Adjust column widths
        const colWidths = [
            { wch: 20 }, // Tanggal Registrasi
            { wch: 30 }, // Nama Lengkap
            { wch: 20 }, // NIK
            { wch: 15 }, // Tanggal Lahir
            { wch: 15 }, // Jenis Kelamin
            { wch: 40 }, // Alamat
            { wch: 20 }, // No Handphone
            { wch: 40 }, // Keterangan
        ];
        worksheet['!cols'] = colWidths;

        // Create a new workbook and append the worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Mustahiq Individu');

        // Generate Excel file and trigger download
        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Data_Mustahiq_Perorangan_${timestamp}.xlsx`);
    } catch (error) {
        console.error('Error exporting Mustahiq Individu to Excel:', error);
        throw error;
    }
};

export const exportMustahiqLembagaExcel = async (startDate?: string, endDate?: string) => {
    try {
        // Fetch mustahiq data where kategori_mustahiq_id IN (2, 3) (Lembaga & Masjid) -> Frontend passing doesn't support array easily, we might need to fetch all and filter or frontend can't list by array natively without backend support.
        // Wait, the backend mustahiqService `getAll` only accepts a single `kategori_mustahiq_id`.
        // So we will do two concurrent fetches for ID 2 and ID 3, then combine them.
        const payloadLembaga: any = { kategori_mustahiq_id: 2, limit: 9999, page: 1 };
        const payloadMasjid: any = { kategori_mustahiq_id: 3, limit: 9999, page: 1 };

        if (startDate) {
            payloadLembaga.start_date = startDate;
            payloadMasjid.start_date = startDate;
        }
        if (endDate) {
            payloadLembaga.end_date = endDate;
            payloadMasjid.end_date = endDate;
        }

        const [resLembaga, resMasjid] = await Promise.all([
            mustahiqApi.list(payloadLembaga) as any,
            mustahiqApi.list(payloadMasjid) as any,
        ]);

        let rowsLembaga = [];
        if (resLembaga && resLembaga.data && Array.isArray(resLembaga.data)) rowsLembaga = resLembaga.data;
        else if (resLembaga && resLembaga.rows && Array.isArray(resLembaga.rows)) rowsLembaga = resLembaga.rows;
        else if (Array.isArray(resLembaga)) rowsLembaga = resLembaga;

        let rowsMasjid = [];
        if (resMasjid && resMasjid.data && Array.isArray(resMasjid.data)) rowsMasjid = resMasjid.data;
        else if (resMasjid && resMasjid.rows && Array.isArray(resMasjid.rows)) rowsMasjid = resMasjid.rows;
        else if (Array.isArray(resMasjid)) rowsMasjid = resMasjid;

        const combinedRows = [...rowsLembaga, ...rowsMasjid];

        console.log('[Export Mustahiq] fetched lembaga+masjid rows:', combinedRows.length);

        if (!combinedRows || combinedRows.length === 0) {
            throw new Error('Tidak ada data mustahiq lembaga/masjid yang ditemukan di rentang tanggal ini.');
        }

        const formatDate = (dateString: string) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Columns requested: Tanggal Registrasi, Nama Lembaga, NIK Pemimpin, jenis lembaga, Jumlah anggota, alamat, telepon, handphone, email, catatan
        // Mapped from DB Mustahiq: 
        // Nama Lembaga -> r.nama
        // NIK Pemimpin -> r.nik
        // jenis lembaga -> KategoriMustahiq.nama
        // alamat -> r.alamat
        // handphone -> r.no_hp
        // catatan -> r.keterangan
        // telepon, jumlah anggota, email -> kosongkan (-)

        const excelData = combinedRows.map((r: any) => ({
            'Tanggal Registrasi': formatDate(r.registered_date),
            'Nama Lembaga': r.nama || '',
            'NIK Pemimpin': r.nik || '',
            'Jenis Lembaga': r.KategoriMustahiq?.nama || r.ref_kategori_mustahiq?.nama || '',
            'Jumlah Anggota': '',
            'Alamat': r.alamat || '',
            'Telepon': '',
            'Handphone': r.no_hp || '',
            'Email': '',
            'Catatan': r.keterangan || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 20 }, // Tanggal Registrasi
            { wch: 40 }, // Nama Lembaga
            { wch: 20 }, // NIK Pemimpin
            { wch: 20 }, // Jenis Lembaga
            { wch: 15 }, // Jumlah Anggota
            { wch: 40 }, // Alamat
            { wch: 15 }, // Telepon
            { wch: 20 }, // Handphone
            { wch: 25 }, // Email
            { wch: 40 }, // Catatan
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Mustahiq Lembaga');

        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Data_Mustahiq_Lembaga_${timestamp}.xlsx`);
    } catch (error) {
        console.error('Error exporting Mustahiq Lembaga to Excel:', error);
        throw error;
    }
};

export const exportPenerimaanZisExcel = async (startDate?: string, endDate?: string) => {
    try {
        const payload: any = { limit: 9999, page: 1 };
        if (startDate) payload.start_date = startDate;
        if (endDate) payload.end_date = endDate;

        const res = await penerimaanApi.list(payload) as any;

        let rows = [];
        if (res && res.data && Array.isArray(res.data)) rows = res.data;
        else if (res && res.rows && Array.isArray(res.rows)) rows = res.rows;
        else if (Array.isArray(res)) rows = res;

        console.log('[Export Penerimaan ZIS] fetched rows:', rows.length);

        if (!rows || rows.length === 0) {
            throw new Error('Tidak ada data penerimaan ZIS yang ditemukan di rentang tanggal ini.');
        }

        const formatDate = (dateString: string) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        const excelData = rows.map((r: any, index: number) => {
            const zisNama = (r.zis?.nama || r.Zis?.nama || '').toLowerCase();
            const jenisZisNama = (r.jenis_zis?.nama || r.JenisZis?.nama || '').toLowerCase();
            const jumlah = parseFloat(r.jumlah) || 0;

            let zakatMaal = 0;
            let zakatFitrah = 0;
            let infak = 0;

            // Zakat (Zakat Maal)
            if (zisNama.includes('zakat') && jenisZisNama.includes('maal')) {
                zakatMaal = jumlah;
            }
            // Zakat Fitrah
            else if (zisNama.includes('zakat') && jenisZisNama.includes('fitrah')) {
                zakatFitrah = jumlah;
            }
            // Infak / Sedekah / DSKL / CSR / Hibah / Fidyah
            else if (zisNama.includes('infak') || zisNama.includes('sedekah') || zisNama.includes('dskl') || zisNama.includes('csr') || zisNama.includes('hibah') || zisNama.includes('fidyah')) {
                infak = jumlah;
            }

            return {
                'No': index + 1,
                'Tgl Transaksi': formatDate(r.tanggal),
                'NPWZ': r.Muzakki?.npwz || r.muzakki?.npwz || '',
                'Nama': r.Muzakki?.nama || r.muzakki?.nama || '',
                'Zakat': zakatMaal || '',
                'Zakat Fitrah': zakatFitrah || '',
                'Infak': infak || '',
                'Titipan': '', // required to be empty
                'Keterangan': r.keterangan || '',
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 },  // No
            { wch: 15 }, // Tgl Transaksi
            { wch: 25 }, // NPWZ
            { wch: 30 }, // Nama
            { wch: 20 }, // Zakat
            { wch: 20 }, // Zakat Fitrah
            { wch: 20 }, // Infak
            { wch: 15 }, // Titipan
            { wch: 40 }, // Keterangan
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Penerimaan ZIS');

        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Data_Penerimaan_ZIS_${timestamp}.xlsx`);
    } catch (error) {
        console.error('Error exporting Penerimaan ZIS to Excel:', error);
        throw error;
    }
};

export const exportDistribusiExcel = async (startDate?: string, endDate?: string) => {
    try {
        const payload: any = { limit: 9999, page: 1, status: 'diterima' };
        if (startDate) payload.startDate = startDate;
        if (endDate) payload.endDate = endDate;

        const res = await distribusiApi.list(payload) as any;

        let rows = [];
        if (res && res.data && Array.isArray(res.data)) rows = res.data;
        else if (res && res.rows && Array.isArray(res.rows)) rows = res.rows;
        else if (Array.isArray(res)) rows = res;

        console.log('[Export Pendistribusian] fetched rows:', rows.length);

        if (!rows || rows.length === 0) {
            throw new Error('Tidak ada data pendistribusian yang ditemukan di rentang tanggal ini.');
        }

        const formatDate = (dateString: string) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        const excelData = rows.map((r: any, index: number) => {
            const asnafNama = (r.asnaf?.nama || r.Asnaf?.nama || '').toLowerCase();
            const jumlah = parseFloat(r.jumlah) || 0;

            let fakir = 0;
            let miskin = 0;
            let riqab = 0;
            let ghamirin = 0;
            let muallaf = 0;
            let fisabilillah = 0;
            let ibnuSabil = 0;

            if (asnafNama.includes('fakir')) { fakir = jumlah; }
            else if (asnafNama.includes('miskin')) { miskin = jumlah; }
            else if (asnafNama.includes('riqob') || asnafNama.includes('riqab')) { riqab = jumlah; }
            else if (asnafNama.includes('gharimin') || asnafNama.includes('ghamirin')) { ghamirin = jumlah; }
            else if (asnafNama.includes('mualaf') || asnafNama.includes('muallaf')) { muallaf = jumlah; }
            else if (asnafNama.includes('fisabilillah') || asnafNama.includes('fisabillillah')) { fisabilillah = jumlah; }
            else if (asnafNama.includes('ibnu sabil')) { ibnuSabil = jumlah; }

            const nrm = r.nrm || r.Mustahiq?.nrm || r.mustahiq?.nrm || '';
            const fNama = r.nama_mustahik || r.Mustahiq?.nama || r.mustahiq?.nama || '';

            return {
                'No': index + 1,
                'Tanggal': formatDate(r.tanggal),
                'NRM': nrm,
                'Nama': fNama,
                'Penerima Manfaat': r.quantity || 0,
                'Fakir': fakir || '',
                'Miskin': miskin || '',
                'Riqab': riqab || '',
                'Ghamirin': ghamirin || '',
                'Muallaf': muallaf || '',
                'Fisabilillah': fisabilillah || '',
                'Ibnu Sabil': ibnuSabil || '',
                'IST': '',
                'ISTT': '',
                'Keterangan': r.keterangan || '',
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
            { wch: 5 },  // No
            { wch: 15 }, // Tanggal
            { wch: 20 }, // NRM
            { wch: 30 }, // Nama
            { wch: 18 }, // Penerima Manfaat
            { wch: 15 }, // Fakir
            { wch: 15 }, // Miskin
            { wch: 15 }, // Riqab
            { wch: 15 }, // Ghamirin
            { wch: 15 }, // Muallaf
            { wch: 15 }, // Fisabilillah
            { wch: 15 }, // Ibnu Sabil
            { wch: 10 }, // IST
            { wch: 10 }, // ISTT
            { wch: 40 }, // Keterangan
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendistribusian');

        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Data_Pendistribusian_${timestamp}.xlsx`);
    } catch (error) {
        console.error('Error exporting Pendistribusian to Excel:', error);
        throw error;
    }
};
