'use client';

import { useState, useEffect, useCallback } from 'react';
import { penerimaanApi, muzakkiApi, refApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface PengumpulanFormProps {
  onSuccess: () => void;
  editingId: number | null;
  onCancelEdit: () => void;
  /** Pre-fill with muzakki data (e.g. from "Tambah Penerimaan" button on muzakki page) */
  prefillMuzakki?: { id: number; label: string; jenis_muzakki_id?: number; jenis_upz_id?: number };
  isReadOnly?: boolean;
}

const today = new Date().toISOString().split('T')[0];

const emptyForm = {
  tanggal: today,
  muzakki_id: '',
  via_id: '',
  metode_bayar_id: '',
  zis_id: '',
  jenis_zis_id: '',
  jumlah: '',
  persentase_amil_id: '',
  no_rekening: '',
  jenis_muzakki_id: '',
  jenis_upz_id: '',
  keterangan: '',
};

export function PengumpulanForm({ onSuccess, editingId, onCancelEdit, prefillMuzakki, isReadOnly = false }: PengumpulanFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Muzakki search state
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [muzakkiResults, setMuzakkiResults] = useState<any[]>([]);
  const [muzakkiSearching, setMuzakkiSearching] = useState(false);
  const [selectedMuzakki, setSelectedMuzakki] = useState<{ id: number; label: string } | null>(null);

  // Ref lists
  const [viaList, setViaList] = useState<any[]>([]);
  const [metodeBayarList, setMetodeBayarList] = useState<any[]>([]);
  const [zisList, setZisList] = useState<any[]>([]);
  const [jenisZisList, setJenisZisList] = useState<any[]>([]);
  const [persentaseAmilList, setPersentaseAmilList] = useState<any[]>([]);
  const [jenisMuzakkiList, setJenisMuzakkiList] = useState<any[]>([]);
  const [jenisUpzList, setJenisUpzList] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  useEffect(() => {
    loadRefs();
  }, []);

  useEffect(() => {
    if (editingId) {
      loadEditData();
    } else {
      setFormData(emptyForm);
      setJenisZisList([]);
      setMetodeBayarList([]);
      if (prefillMuzakki) {
        setSelectedMuzakki(prefillMuzakki);
        setFormData((p) => ({
          ...p,
          muzakki_id: String(prefillMuzakki.id),
          jenis_muzakki_id: prefillMuzakki.jenis_muzakki_id ? String(prefillMuzakki.jenis_muzakki_id) : p.jenis_muzakki_id,
          jenis_upz_id: prefillMuzakki.jenis_upz_id ? String(prefillMuzakki.jenis_upz_id) : p.jenis_upz_id
        }));
      } else {
        setSelectedMuzakki(null);
      }
    }
  }, [editingId, prefillMuzakki]);

  const loadRefs = async () => {
    setLoadingRefs(true);
    try {
      const [viaRes, zisRes, amRes, jmRes, jupzRes] = await Promise.allSettled([
        refApi.list('via-penerimaan'),
        refApi.list('zis'),
        refApi.list('persentase-amil'),
        refApi.list('jenis-muzakki'),
        refApi.list('jenis-upz'),
      ]);
      const g = (r: any) => r.status === 'fulfilled' && Array.isArray(r.value?.data) ? r.value.data : [];
      setViaList(g(viaRes));
      setZisList(g(zisRes));
      setPersentaseAmilList(g(amRes));
      setJenisMuzakkiList(g(jmRes));
      setJenisUpzList(g(jupzRes));
    } finally {
      setLoadingRefs(false);
    }
  };

  const loadJenisZis = async (zisId: string) => {
    try {
      const res = await refApi.list('jenis-zis', { zis_id: zisId });
      if (Array.isArray(res.data)) setJenisZisList(res.data);
      else setJenisZisList([]);
    } catch { setJenisZisList([]); }
  };

  const loadMetodeBayar = async (viaId: string) => {
    try {
      const res = await refApi.list('metode-bayar', { via_penerimaan_id: viaId });
      const data = Array.isArray(res.data) ? res.data : [];
      setMetodeBayarList(data);
      return data;
    } catch {
      setMetodeBayarList([]);
      return [];
    }
  };

  const loadEditData = async () => {
    if (!editingId) return;
    try {
      const res = await penerimaanApi.get(editingId);
      if (res.data) {
        const d: any = res.data;
        const zisId = String(d.zis_id || '');
        const viaId = String(d.via_id || '');
        if (zisId) await loadJenisZis(zisId);
        if (viaId) await loadMetodeBayar(viaId);

        setFormData({
          tanggal: d.tanggal ? d.tanggal.split('T')[0] : today,
          muzakki_id: String(d.muzakki_id || ''),
          via_id: viaId,
          metode_bayar_id: String(d.metode_bayar_id || ''),
          zis_id: zisId,
          jenis_zis_id: String(d.jenis_zis_id || ''),
          jumlah: String(d.jumlah || ''),
          persentase_amil_id: String(d.persentase_amil_id || ''),
          no_rekening: d.no_rekening || '',
          jenis_muzakki_id: String(d.jenis_muzakki_id || ''),
          jenis_upz_id: String(d.jenis_upz_id || ''),
          keterangan: d.keterangan || '',
        });

        const mzk = d.Muzakki || d.muzakki;
        if (mzk) {
          setSelectedMuzakki({ id: d.muzakki_id, label: `${mzk.nama}${mzk.npwz ? ` (${mzk.npwz})` : ''}` });
        } else if (d.nama_muzakki) {
          setSelectedMuzakki({ id: d.muzakki_id, label: d.nama_muzakki });
        }
      }
    } catch {
      toast.error('Gagal memuat data untuk edit');
    }
  };

  const handleMuzakkiSearch = useCallback(async () => {
    if (!muzakkiSearch.trim()) { setMuzakkiResults([]); return; }
    setMuzakkiSearching(true);
    try {
      const res = await muzakkiApi.list({ q: muzakkiSearch, page: 1, limit: 10 });
      const d: any = res.data;
      const arr = Array.isArray(d) ? d : d?.data ?? [];
      setMuzakkiResults(arr);
    } catch { setMuzakkiResults([]); }
    finally { setMuzakkiSearching(false); }
  }, [muzakkiSearch]);

  const selectMuzakki = (m: any) => {
    setSelectedMuzakki({ id: m.id, label: `${m.nama}${m.npwz ? ` (${m.npwz})` : ''}${m.nik ? ` / NIK: ${m.nik}` : ''}` });
    setFormData((p) => ({
      ...p,
      muzakki_id: String(m.id),
      jenis_muzakki_id: m.jenis_muzakki_id ? String(m.jenis_muzakki_id) : p.jenis_muzakki_id,
      jenis_upz_id: m.jenis_upz_id ? String(m.jenis_upz_id) : p.jenis_upz_id
    }));
    setMuzakkiSearch('');
    setMuzakkiResults([]);
  };

  const set = (f: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!formData.muzakki_id) { toast.error('Field "Muzakki" wajib dipilih'); setIsLoading(false); return; }
    if (!formData.tanggal) { toast.error('Field "Tanggal" wajib diisi'); setIsLoading(false); return; }
    if (!formData.via_id) { toast.error('Field "Via Pembayaran" wajib dipilih'); setIsLoading(false); return; }
    if (!formData.zis_id) { toast.error('Field "ZIS" (Zakat/Infaq/Sedekah) wajib dipilih'); setIsLoading(false); return; }
    if (!formData.jenis_zis_id) { toast.error('Field "Jenis ZIS" wajib dipilih'); setIsLoading(false); return; }
    if (!formData.jumlah || parseFloat(formData.jumlah) <= 0) { toast.error('Field "Jumlah" harus lebih dari 0'); setIsLoading(false); return; }
    if (!formData.persentase_amil_id) { toast.error('Field "Persentase Amil" wajib dipilih'); setIsLoading(false); return; }
    if (!formData.jenis_muzakki_id) { toast.error('Field "Jenis Muzakki" wajib dipilih'); setIsLoading(false); return; }
    if (!formData.metode_bayar_id) { toast.error('Field "Metode Bayar" wajib dipilih'); setIsLoading(false); return; }

    try {
      const payload: any = {
        tanggal: formData.tanggal,
        muzakki_id: parseInt(formData.muzakki_id),
        via_id: parseInt(formData.via_id),
        zis_id: parseInt(formData.zis_id),
        jenis_zis_id: parseInt(formData.jenis_zis_id),
        jumlah: parseFloat(formData.jumlah),
        persentase_amil_id: parseInt(formData.persentase_amil_id),
      };
      if (formData.metode_bayar_id) payload.metode_bayar_id = parseInt(formData.metode_bayar_id);
      if (formData.jenis_muzakki_id) payload.jenis_muzakki_id = parseInt(formData.jenis_muzakki_id);
      if (formData.jenis_upz_id) payload.jenis_upz_id = parseInt(formData.jenis_upz_id);
      if (formData.no_rekening) payload.no_rekening = formData.no_rekening;
      if (formData.keterangan) payload.keterangan = formData.keterangan;

      if (editingId) await penerimaanApi.update(editingId, payload);
      else await penerimaanApi.create(payload);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data penerimaan';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const Section = ({ title }: { title: string }) => (
    <div className="md:col-span-3 pt-3 pb-1 border-b">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
    </div>
  );

  const Req = () => <span className="text-destructive ml-1">*</span>;

  const Sel = ({ label, field, items, disabled, placeholder, required }: {
    label: string; field: keyof typeof emptyForm;
    items: any[]; disabled?: boolean; placeholder: string; required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label}{required && <Req />}</Label>
      <Select value={formData[field] as string}
        onValueChange={(v) => setFormData((p) => ({ ...p, [field]: v }))}
        disabled={disabled || loadingRefs || isReadOnly}>
        <SelectTrigger>
          <SelectValue placeholder={loadingRefs ? 'Memuat...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => <SelectItem key={it.id} value={String(it.id)}>{it.label ?? it.nama}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Kolom 1: Transaksi & Muzakki */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Muzakki & Waktu</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal<Req /></Label>
            <Input id="tanggal" type="date" required value={formData.tanggal} onChange={set('tanggal')} readOnly={isReadOnly} />
          </div>
          <div className="space-y-2">
            <Label>Muzakki<Req /></Label>
            {selectedMuzakki ? (
              <div className="flex items-center gap-2">
                <Input value={selectedMuzakki.label} readOnly className="bg-muted flex-1" />
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => { setSelectedMuzakki(null); setFormData((p) => ({ ...p, muzakki_id: '' })); }} disabled={isReadOnly}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Cari muzakki..."
                    value={muzakkiSearch}
                    onChange={(e) => setMuzakkiSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleMuzakkiSearch())}
                    readOnly={isReadOnly}
                  />
                  <Button type="button" variant="outline" onClick={handleMuzakkiSearch} disabled={muzakkiSearching || isReadOnly}>
                    {muzakkiSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {muzakkiResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-40 overflow-y-auto shadow-sm bg-background">
                    {muzakkiResults.map((m) => (
                      <button key={m.id} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => selectMuzakki(m)}>
                        {m.nama} {m.npwz && `(${m.npwz})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <Sel label="Jenis Muzakki" field="jenis_muzakki_id" items={jenisMuzakkiList} placeholder="Pilih jenis" required />
          <Sel label="Jenis UPZ" field="jenis_upz_id" items={jenisUpzList} placeholder="Pilih jenis" />
        </div>

        {/* Kolom 2: Detail ZIS */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detail ZIS</h3>
          </div>
          <div className="space-y-2">
            <Label>ZIS<Req /></Label>
            <Select value={formData.zis_id}
              onValueChange={async (v) => {
                setFormData((p) => {
                  const newData = { ...p, zis_id: v, jenis_zis_id: '' };
                  const selectedZis = zisList.find(z => String(z.id) === v);
                  if (selectedZis) {
                    const label = selectedZis.nama.toLowerCase();
                    if (label.includes('zakat')) {
                      const amil = persentaseAmilList.find(a => a.label === '12.5%');
                      if (amil) newData.persentase_amil_id = String(amil.id);
                    } else if (label.includes('infaq') || label.includes('infak') || label.includes('fidyah') || label.includes('dskl') || label.includes('sedekah')) {
                      const amil = persentaseAmilList.find(a => a.label === '20%');
                      if (amil) newData.persentase_amil_id = String(amil.id);
                    }
                  }
                  return newData;
                });
                setJenisZisList([]);
                if (v) await loadJenisZis(v);
              }} disabled={loadingRefs || isReadOnly}>
              <SelectTrigger><SelectValue placeholder="Pilih Zakat / Infaq / Sedekah" /></SelectTrigger>
              <SelectContent>{zisList.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jenis {zisList.find(z => z.id.toString() === formData.zis_id)?.nama || 'ZIS'}<Req /></Label>
            <Select value={formData.jenis_zis_id}
              onValueChange={(v) => setFormData((p) => ({ ...p, jenis_zis_id: v }))}
              disabled={!formData.zis_id || jenisZisList.length === 0 || isReadOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis detail" />
              </SelectTrigger>
              <SelectContent>{jenisZisList.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah (Rp)<Req /></Label>
            <Input id="jumlah" type="number" min="1" step="0.01" placeholder="Nominal"
              value={formData.jumlah} onChange={set('jumlah')} readOnly={isReadOnly} />
          </div>
          <Sel label="Persentase Amil" field="persentase_amil_id" items={persentaseAmilList}
            placeholder="Pilih amil" required />
        </div>

        {/* Kolom 3: Pembayaran & Lainnya */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pembayaran & Lainnya</h3>
          </div>
          <div className="space-y-2">
            <Label>Via Pembayaran<Req /></Label>
            <Select value={formData.via_id}
              onValueChange={async (v) => {
                setFormData((p) => ({ ...p, via_id: v, metode_bayar_id: '' }));
                setMetodeBayarList([]);
                if (v) {
                  const via = viaList.find(it => String(it.id) === v);
                  const results = await loadMetodeBayar(v);
                  if (via && via.nama.toLowerCase() === 'cash') {
                    const tunai = results?.find((m: any) => m.nama.toLowerCase() === 'tunai');
                    if (tunai) setFormData(p => ({ ...p, metode_bayar_id: String(tunai.id) }));
                  }
                }
              }} disabled={loadingRefs || isReadOnly}>
              <SelectTrigger><SelectValue placeholder="Pilih via" /></SelectTrigger>
              <SelectContent>{viaList.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Metode Bayar<Req /></Label>
            <Select value={formData.metode_bayar_id}
              onValueChange={(v) => setFormData((p) => ({ ...p, metode_bayar_id: v }))}
              disabled={!formData.via_id || metodeBayarList.length === 0 || isReadOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>{metodeBayarList.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="no_rekening">No. Rekening</Label>
            <Input id="no_rekening" placeholder="Nomor rekening" maxLength={50}
              value={formData.no_rekening} onChange={set('no_rekening')} readOnly={isReadOnly} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea id="keterangan" placeholder="Catatan" rows={2}
              value={formData.keterangan} onChange={set('keterangan')} readOnly={isReadOnly} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isLoading}>{isReadOnly ? 'Tutup' : 'Batal'}</Button>
        {!isReadOnly && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : editingId ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        )}
      </div>
    </form>
  );
}
