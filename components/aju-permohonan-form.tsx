'use client';

import { useState, useEffect, useCallback } from 'react';
import { distribusiApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { refApi, mustahiqApi } from '@/lib/api';
import { toast } from 'sonner';

interface AjuPermohonanFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    mustahiqId: number;
    mustahiqLabel: string; // "Nama (NRM)"
}

/**
 * Form Aju Permohonan — hanya field yang relevan untuk permohonan:
 * mustahiq (read-only), no_reg_bpp, nama_program, sub_program,
 * program_kegiatan, tgl_masuk_permohonan (default today),
 * jumlah_permohonan, rekomendasi_upz, keterangan.
 */

const Req = () => <span className="text-destructive ml-1">*</span>;

export function AjuPermohonanForm({ onSuccess, onCancel, mustahiqId, mustahiqLabel }: AjuPermohonanFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const [programList, setProgramList] = useState<any[]>([]);
    const [subProgramList, setSubProgramList] = useState<any[]>([]);
    const [kegiatanList, setKegiatanList] = useState<any[]>([]);
    const [loadingRefs, setLoadingRefs] = useState(true);

    const today = new Date().toISOString().split('T')[0];

    const [kategoriMustahiqId, setKategoriMustahiqId] = useState<number | undefined>();

    const [form, setForm] = useState({
        no_reg_bpp: '',
        nama_entitas_id: '',
        nama_program_id: '',
        sub_program_id: '',
        program_kegiatan_id: '',
        tgl_masuk_permohonan: today,
        jumlah_permohonan: '',
        rekomendasi_upz: '',
        keterangan: '',
    });

    const [entitas, setEntitas] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoadingRefs(true);
            try {
                const [entitasRes, progRes, mustahiqRes] = await Promise.all([
                    refApi.list('nama-entitas'),
                    refApi.list('nama-program'),
                    mustahiqApi.get(mustahiqId)
                ]);
                if (Array.isArray(entitasRes.data)) setEntitas(entitasRes.data);
                if (Array.isArray(progRes.data)) setProgramList(progRes.data);
                if (mustahiqRes.data?.kategori_mustahiq_id) {
                    setKategoriMustahiqId(mustahiqRes.data.kategori_mustahiq_id);
                }
            } catch (e) {
                console.error('ref load error:', e);
            } finally {
                setLoadingRefs(false);
            }
        };
        load();
    }, []);

    const handleProgramChange = useCallback(async (v: string) => {
        setForm((p) => ({ ...p, nama_program_id: v, sub_program_id: '', program_kegiatan_id: '' }));
        setSubProgramList([]);
        setKegiatanList([]);
        if (!v) return;
        try {
            const res = await refApi.list('sub-program', { nama_program_id: v });
            if (Array.isArray(res.data)) setSubProgramList(res.data);
        } catch {
            setSubProgramList([]);
        }
    }, []);

    const handleSubProgramChange = useCallback(async (v: string) => {
        setForm((p) => ({ ...p, sub_program_id: v, program_kegiatan_id: '' }));
        setKegiatanList([]);
        if (!v) return;
        try {
            const res = await refApi.list('program-kegiatan', { sub_program_id: v });
            if (Array.isArray(res.data)) setKegiatanList(res.data);
        } catch {
            setKegiatanList([]);
        }
    }, []);

    const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [f]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (!form.nama_entitas_id) {
            toast.error('Field "Nama Entitas" wajib dipilih');
            setIsLoading(false);
            return;
        }
        if (!form.no_reg_bpp.trim()) {
            toast.error('Field "No. Reg BPP" wajib diisi');
            setIsLoading(false);
            return;
        }
        if (!form.nama_program_id) {
            toast.error('Field "Program" wajib dipilih');
            setIsLoading(false);
            return;
        }
        if (!form.sub_program_id) {
            toast.error('Field "Sub Program" wajib dipilih');
            setIsLoading(false);
            return;
        }
        if (!form.jumlah_permohonan || parseFloat(form.jumlah_permohonan) <= 0) {
            toast.error('Field "Jumlah Permohonan" harus lebih dari 0');
            setIsLoading(false);
            return;
        }
        try {
            const payload: any = {
                mustahiq_id: mustahiqId,
                tanggal: today,
                no_reg_bpp: form.no_reg_bpp || undefined,
                tgl_masuk_permohonan: form.tgl_masuk_permohonan || undefined,
                jumlah_permohonan: parseFloat(form.jumlah_permohonan),
                jumlah: 0,
                nama_entitas_id: form.nama_entitas_id ? parseInt(form.nama_entitas_id) : undefined,
                nama_program_id: form.nama_program_id ? parseInt(form.nama_program_id) : undefined,
                sub_program_id: form.sub_program_id ? parseInt(form.sub_program_id) : undefined,
                program_kegiatan_id: form.program_kegiatan_id ? parseInt(form.program_kegiatan_id) : undefined,
                kategori_mustahiq_id: kategoriMustahiqId,
                rekomendasi_upz: form.rekomendasi_upz || undefined,
                keterangan: form.keterangan || undefined,
            };
            await distribusiApi.create(payload);
            onSuccess();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan permohonan');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                {/* Mustahiq — read only */}
                <div className="space-y-2 md:col-span-2">
                    <Label>Mustahiq</Label>
                    <Input value={mustahiqLabel} readOnly className="bg-muted font-medium" />
                </div>

                {/* No Reg BPP */}
                <div className="space-y-2">
                    <Label htmlFor="no_reg_bpp">No. Reg BPP<Req /></Label>
                    <Input id="no_reg_bpp" placeholder="No. Reg BPP" maxLength={12}
                        value={form.no_reg_bpp} onChange={set('no_reg_bpp')} />
                </div>

                {/* Tgl Masuk Permohonan */}
                <div className="space-y-2">
                    <Label htmlFor="tgl_masuk_permohonan">Tgl. Masuk Permohonan</Label>
                    <Input id="tgl_masuk_permohonan" type="date"
                        value={form.tgl_masuk_permohonan} onChange={set('tgl_masuk_permohonan')} />
                </div>

                {/* Jumlah Permohonan */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="jumlah_permohonan">Jumlah Permohonan (Rp) <span className="text-destructive">*</span></Label>
                    <Input id="jumlah_permohonan" type="number" min="1" step="0.01"
                        placeholder="Nominal yang diajukan"
                        value={form.jumlah_permohonan} onChange={set('jumlah_permohonan')} />
                </div>

                {/* Nama Entitas */}
                <div className="space-y-2 md:col-span-2">
                    <Label>Nama Entitas <span className="text-destructive">*</span></Label>
                    <Select value={form.nama_entitas_id}
                        onValueChange={(v) => setForm((p) => ({ ...p, nama_entitas_id: v }))}
                        disabled={loadingRefs}>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingRefs ? 'Memuat...' : 'Pilih entitas'} />
                        </SelectTrigger>
                        <SelectContent>
                            {entitas.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Nama Program */}
                <div className="space-y-2">
                    <Label>Program<Req /></Label>
                    <Select value={form.nama_program_id} onValueChange={handleProgramChange} disabled={loadingRefs}>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingRefs ? 'Memuat...' : 'Pilih program'} />
                        </SelectTrigger>
                        <SelectContent>
                            {programList.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Sub Program */}
                <div className="space-y-2">
                    <Label>Sub Program<Req /></Label>
                    <Select value={form.sub_program_id}
                        onValueChange={handleSubProgramChange}
                        disabled={!form.nama_program_id || subProgramList.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={!form.nama_program_id ? 'Pilih program dulu' : subProgramList.length === 0 ? 'Tidak ada sub-program' : 'Pilih sub-program'} />
                        </SelectTrigger>
                        <SelectContent>
                            {subProgramList.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Program Kegiatan */}
                <div className="space-y-2 md:col-span-2">
                    <Label>Program Kegiatan</Label>
                    <Select value={form.program_kegiatan_id}
                        onValueChange={(v) => setForm((p) => ({ ...p, program_kegiatan_id: v }))}
                        disabled={!form.sub_program_id || kegiatanList.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={!form.sub_program_id ? 'Pilih sub-program dulu' : kegiatanList.length === 0 ? 'Tidak ada kegiatan' : 'Pilih kegiatan'} />
                        </SelectTrigger>
                        <SelectContent>
                            {kegiatanList.map((k) => (
                                <SelectItem key={k.id} value={String(k.id)}>{k.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Rekomendasi UPZ */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="rekomendasi_upz">Rekomendasi UPZ</Label>
                    <Textarea id="rekomendasi_upz" placeholder="Nama UPZ yang merekomendasikan (opsional)" rows={2}
                        value={form.rekomendasi_upz} onChange={set('rekomendasi_upz')} />
                </div>

                {/* Keterangan */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Textarea id="keterangan" placeholder="Catatan tambahan (opsional)" rows={2}
                        value={form.keterangan} onChange={set('keterangan')} />
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Batal</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Ajukan Permohonan'}
                </Button>
            </div>
        </form>
    );
}
