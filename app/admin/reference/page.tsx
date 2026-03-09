'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { refApi, RefResource } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Database, Search, ChevronRight } from 'lucide-react';

// ─── RESOURCE CONFIG ──────────────────────────────────────────────────────────
type ResourceConfig = {
    val: RefResource;
    label: string;
    group: string;
    parentResource?: RefResource;   // resource to fetch for parent dropdown
    parentLabel?: string;           // display name for parent column
    parentKey?: string;             // FK field name on child (e.g. 'kecamatan_id')
    parentAccessor?: string;        // the included association key on response item (e.g. 'Kecamatan')
    useLabel?: boolean;             // PersentaseAmil uses 'label' not 'nama'
    extraFields?: { key: string; label: string; type: 'text' | 'number'; step?: string; hint?: string }[];
};

const RESOURCES: ResourceConfig[] = [
    // Wilayah
    { val: 'kecamatan', label: 'Kecamatan', group: 'Wilayah' },
    {
        val: 'kelurahan', label: 'Kelurahan', group: 'Wilayah',
        parentResource: 'kecamatan', parentLabel: 'Kecamatan', parentKey: 'kecamatan_id',
        parentAccessor: 'ref_kecamatan'
    },

    // Muzakki
    { val: 'jenis-muzakki', label: 'Jenis Muzakki', group: 'Muzakki' },
    { val: 'jenis-upz', label: 'Jenis UPZ', group: 'Muzakki' },

    // Penerimaan
    { val: 'zis', label: 'ZIS', group: 'Penerimaan' },
    {
        val: 'jenis-zis', label: 'Jenis ZIS', group: 'Penerimaan',
        parentResource: 'zis', parentLabel: 'ZIS', parentKey: 'zis_id',
        parentAccessor: 'zis'
    },
    { val: 'via-penerimaan', label: 'Via Penerimaan', group: 'Penerimaan' },
    {
        val: 'metode-bayar', label: 'Metode Bayar', group: 'Penerimaan',
        parentResource: 'via-penerimaan', parentLabel: 'Via Penerimaan', parentKey: 'via_penerimaan_id',
        parentAccessor: 'ref_via_penerimaan'
    },
    {
        val: 'persentase-amil', label: 'Persentase Amil', group: 'Penerimaan',
        useLabel: true,
        extraFields: [
            { key: 'nilai', label: 'Nilai Desimal (0.125 = 12.5%)', type: 'number', step: '0.0001', hint: 'Contoh: 0.125 untuk 12.5%' }
        ]
    },

    // Mustahiq
    { val: 'asnaf', label: 'Asnaf', group: 'Mustahiq' },
    { val: 'kategori-mustahiq', label: 'Kategori Mustahiq', group: 'Mustahiq' },

    // Distribusi
    { val: 'nama-program', label: 'Nama Program', group: 'Distribusi' },
    {
        val: 'sub-program', label: 'Sub Program', group: 'Distribusi',
        parentResource: 'nama-program', parentLabel: 'Nama Program', parentKey: 'nama_program_id',
        parentAccessor: 'ref_nama_program'
    },
    {
        val: 'program-kegiatan', label: 'Program Kegiatan', group: 'Distribusi',
        parentResource: 'sub-program', parentLabel: 'Sub Program', parentKey: 'sub_program_id',
        parentAccessor: 'ref_sub_program'
    },
    { val: 'nama-entitas', label: 'Nama Entitas', group: 'Distribusi' },
    { val: 'frekuensi-bantuan', label: 'Frekuensi Bantuan', group: 'Distribusi' },
    { val: 'jenis-zis-distribusi', label: 'Jenis ZIS Distribusi', group: 'Distribusi' },
    { val: 'infak', label: 'Infak', group: 'Distribusi' },
];

const GROUPS = ['Wilayah', 'Muzakki', 'Penerimaan', 'Mustahiq', 'Distribusi'];

function getDataLabel(item: any, config: ResourceConfig) {
    return config.useLabel ? item.label : item.nama;
}

function getParentName(item: any, config: ResourceConfig) {
    if (!config.parentAccessor) return null;
    const assoc = item[config.parentAccessor];
    return assoc?.nama || null;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ReferenceManagementPage() {
    const [activeConfig, setActiveConfig] = useState<ResourceConfig>(RESOURCES[0]);
    const resource = activeConfig.val;

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Parent dropdown state
    const [parentOptions, setParentOptions] = useState<any[]>([]);
    const [loadingParents, setLoadingParents] = useState(false);

    const [formData, setFormData] = useState<Record<string, any>>({ nama: '', deskripsi: '' });

    const resetForm = useCallback(() => {
        const base: Record<string, any> = {};
        if (activeConfig.useLabel) {
            base.label = '';
        } else {
            base.nama = '';
            base.deskripsi = '';
        }
        if (activeConfig.parentKey) base[activeConfig.parentKey] = '';
        activeConfig.extraFields?.forEach(f => { base[f.key] = ''; });
        setFormData(base);
        setEditingItem(null);
    }, [activeConfig]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setSearchTerm('');
        try {
            const res = await refApi.list(resource);
            if (res.success && res.data) setData(res.data);
        } catch {
            toast.error('Gagal mengambil data referensi.');
        } finally {
            setLoading(false);
        }
    }, [resource]);

    // Load parent options when resource changes
    useEffect(() => {
        fetchData();
        resetForm();

        if (activeConfig.parentResource) {
            setLoadingParents(true);
            refApi.list(activeConfig.parentResource)
                .then(r => setParentOptions(r.data || []))
                .catch(() => setParentOptions([]))
                .finally(() => setLoadingParents(false));
        } else {
            setParentOptions([]);
        }
    }, [resource]);

    const handleEdit = (item: any) => {
        setEditingItem(item);
        const fd: Record<string, any> = {};
        if (activeConfig.useLabel) {
            fd.label = item.label || '';
        } else {
            fd.nama = item.nama || '';
            fd.deskripsi = item.deskripsi || '';
        }
        if (activeConfig.parentKey) fd[activeConfig.parentKey] = item[activeConfig.parentKey] || '';
        activeConfig.extraFields?.forEach(f => { fd[f.key] = item[f.key] ?? ''; });
        setFormData(fd);
        setOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return;
        try {
            await refApi.delete(resource, id);
            toast.success('Data berhasil dihapus');
            fetchData();
        } catch { toast.error('Gagal menghapus data'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Sanitize numbers
            const payload: Record<string, any> = { ...formData };
            activeConfig.extraFields?.forEach(f => {
                if (f.type === 'number' && payload[f.key] !== '') {
                    payload[f.key] = parseFloat(payload[f.key]);
                }
            });
            if (activeConfig.parentKey && payload[activeConfig.parentKey] !== '') {
                payload[activeConfig.parentKey] = parseInt(payload[activeConfig.parentKey]);
            }

            if (editingItem) {
                await refApi.update(resource, editingItem.id, payload);
                toast.success('Data berhasil diupdate');
            } else {
                await refApi.create(resource, payload);
                toast.success('Data berhasil ditambahkan');
            }
            setOpen(false);
            resetForm();
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Gagal menyimpan data');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredData = data.filter(item => {
        const name = activeConfig.useLabel ? item.label : item.nama;
        return name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const grouped = GROUPS.map(g => ({
        group: g,
        items: RESOURCES.filter(r => r.group === g),
    }));

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Data Referensi</h1>
                        <p className="text-muted-foreground">Kelola data master dan tabel referensi sistem.</p>
                    </div>

                    {/* Add Dialog */}
                    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Tambah Data
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Edit Data' : 'Tambah Data Baru'}</DialogTitle>
                                <DialogDescription>
                                    Tabel: <strong>{activeConfig.label}</strong>
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                {/* Parent dropdown */}
                                {activeConfig.parentResource && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{activeConfig.parentLabel} <span className="text-destructive">*</span></label>
                                        <Select
                                            value={String(formData[activeConfig.parentKey!] || '')}
                                            onValueChange={val => setFormData({ ...formData, [activeConfig.parentKey!]: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Pilih ${activeConfig.parentLabel}...`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {parentOptions.map(p => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Name / Label field */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {activeConfig.useLabel ? 'Label' : 'Nama'} <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        value={activeConfig.useLabel ? formData.label : formData.nama}
                                        onChange={e => setFormData({ ...formData, [activeConfig.useLabel ? 'label' : 'nama']: e.target.value })}
                                        placeholder={activeConfig.useLabel ? 'Contoh: 12.5%' : 'Masukkan nama'}
                                        required
                                    />
                                </div>

                                {/* Extra fields (e.g. nilai for persentase-amil) */}
                                {activeConfig.extraFields?.map(f => (
                                    <div key={f.key} className="space-y-2">
                                        <label className="text-sm font-medium">{f.label} <span className="text-destructive">*</span></label>
                                        <Input
                                            type={f.type}
                                            step={f.step}
                                            value={formData[f.key] || ''}
                                            onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                            placeholder={f.hint || ''}
                                            required
                                        />
                                        {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                                    </div>
                                ))}

                                {/* Deskripsi (only for standard simple refs) */}
                                {!activeConfig.useLabel && !activeConfig.parentResource && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Deskripsi</label>
                                        <Input
                                            value={formData.deskripsi || ''}
                                            onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                                            placeholder="Deskripsi (opsional)"
                                        />
                                    </div>
                                )}

                                <DialogFooter className="pt-4">
                                    <Button type="submit" disabled={submitting} className="w-full">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Sidebar */}
                    <Card className="w-full md:w-64 shrink-0 h-fit">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Database className="h-4 w-4" /> Kategori
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <div className="space-y-3">
                                {grouped.map(({ group, items }) => (
                                    <div key={group}>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 pb-1">{group}</p>
                                        <div className="space-y-0.5">
                                            {items.map(res => (
                                                <button
                                                    key={res.val}
                                                    onClick={() => setActiveConfig(res)}
                                                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-all flex items-center justify-between ${activeConfig.val === res.val
                                                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                                        : 'hover:bg-muted'
                                                        }`}
                                                >
                                                    <span>{res.label}</span>
                                                    {res.parentLabel && (
                                                        <ChevronRight className="h-3 w-3 opacity-50" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="flex-1 overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="capitalize flex items-center gap-2">
                                    {activeConfig.parentLabel && (
                                        <Badge variant="outline" className="font-normal text-xs">
                                            {activeConfig.parentLabel}
                                        </Badge>
                                    )}
                                    {activeConfig.label}
                                </CardTitle>
                                <CardDescription>Total {data.length} item ditemukan.</CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari data..."
                                    className="pl-9 h-9"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex h-60 items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[80px]">ID</TableHead>
                                                {activeConfig.parentLabel && <TableHead>{activeConfig.parentLabel}</TableHead>}
                                                <TableHead>Nama / Label</TableHead>
                                                {activeConfig.val === 'persentase-amil' && <TableHead>Nilai (%)</TableHead>}
                                                {!activeConfig.parentLabel && activeConfig.val !== 'persentase-amil' && <TableHead>Deskripsi</TableHead>}
                                                <TableHead className="text-right w-[100px]">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                        Tidak ada data ditemukan.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredData.map(item => (
                                                    <TableRow key={item.id} className="hover:bg-muted/20">
                                                        <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                                        {activeConfig.parentLabel && (
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                {getParentName(item, activeConfig) || '-'}
                                                            </TableCell>
                                                        )}
                                                        <TableCell className="font-semibold">
                                                            {getDataLabel(item, activeConfig)}
                                                        </TableCell>
                                                        {activeConfig.val === 'persentase-amil' && (
                                                            <TableCell>
                                                                <Badge variant="secondary">{(parseFloat(item.nilai) * 100).toFixed(2)}%</Badge>
                                                            </TableCell>
                                                        )}
                                                        {!activeConfig.parentLabel && activeConfig.val !== 'persentase-amil' && (
                                                            <TableCell className="text-muted-foreground text-sm">{item.deskripsi || '-'}</TableCell>
                                                        )}
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
