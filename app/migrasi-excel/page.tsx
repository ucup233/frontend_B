'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Upload, Loader2, CheckCircle2, FileUp, Download, Info } from 'lucide-react';
import { migrasiApi } from '@/lib/api';

type DataType = 'mustahiq' | 'muzakki' | 'penerimaan' | 'distribusi' | 'penerimaan_excel' | 'distribusi_excel';

const TYPE_LABELS: Record<DataType, string> = {
  mustahiq: 'Mustahiq',
  muzakki: 'Muzakki',
  penerimaan: 'Penerimaan',
  distribusi: 'Distribusi',
  penerimaan_excel: 'Penerimaan',
  distribusi_excel: 'Distribusi',
};

const STANDARD_TYPES: DataType[] = ['mustahiq', 'muzakki'];
const CUSTOM_TYPES: DataType[] = ['penerimaan_excel', 'distribusi_excel'];

export default function MigrasiExcelPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<DataType>('mustahiq');

  const [previewResult, setPreviewResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resetState = () => {
    setFile(null);
    setPreviewResult(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (selectedFile: File, selectedType: DataType) => {
    setError(null);
    setSuccess(null);
    setPreviewResult(null);

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('File harus berformat .xlsx, .xls, atau .csv');
      return;
    }

    try {
      setIsLoading(true);
      const res = await migrasiApi.preview(selectedFile, selectedType);

      if (res.success) {
        setFile(selectedFile);
        setPreviewResult(res.data);
      } else {
        setError(res.message || 'Gagal memproses file Excel');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membaca file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0], dataType);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0], dataType);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await migrasiApi.import(file, dataType);
      if (res.success) {
        setSuccess(`Berhasil mengimport ${res.berhasil} baris data. Gagal: ${res.gagal} baris.`);
        setPreviewResult(null);
        setFile(null);
      } else {
        setError(res.message || 'Gagal mengimport data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async (jenis: DataType) => {
    try {
      setIsLoading(true);
      const blob = await migrasiApi.downloadTemplate(jenis);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Migrasi_${jenis}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError('Gagal mendownload template excel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-balance">Migrasi Data Excel</h1>
            <p className="text-muted-foreground mt-1">
              Import data master dan transaksi sekaligus menggunakan file Excel
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center mb-4">
                <CardTitle>Upload File</CardTitle>
                <div className="flex gap-2">
                  {/* ── Tipe standar ── */}
                  {STANDARD_TYPES.map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={dataType === t ? 'default' : 'outline'}
                      onClick={() => {
                        setDataType(t);
                        resetState();
                      }}
                    >
                      {TYPE_LABELS[t]}
                    </Button>
                  ))}
                  {/* ── Format Excel lama ── */}
                  {CUSTOM_TYPES.map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={dataType === t ? 'secondary' : 'outline'}
                      className={dataType === t ? 'ring-2 ring-orange-400' : 'border-orange-300 text-orange-700 hover:bg-orange-50'}
                      onClick={() => {
                        setDataType(t);
                        resetState();
                      }}
                    >
                      🗂 {TYPE_LABELS[t]}
                    </Button>
                  ))}
                </div>
              </div>
              <CardDescription>
                Pilih tipe data di atas, lalu upload file Excel yang sesuai.<br />
                <span className="text-orange-600 font-medium">🗂 Format Excel</span>: langsung pakai file Excel Anda yang sudah ada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/50'
                  }`}
              >
                <input
                  type="file"
                  id="file-input"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  disabled={isLoading}
                />
                <label htmlFor="file-input" className="cursor-pointer block w-full h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-lg">Pilih file atau drag &amp; drop</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Format .xlsx untuk <strong>{TYPE_LABELS[dataType]}</strong>
                      </p>
                      {CUSTOM_TYPES.includes(dataType) && (
                        <p className="text-xs text-orange-600 mt-1">✓ Format Excel lama dikenali — tidak perlu ubah kolom</p>
                      )}
                    </div>
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />}
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Download Template</CardTitle>
              <CardDescription>
                Gunakan template Excel berikut agar format data sesuai dengan sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...STANDARD_TYPES, ...CUSTOM_TYPES].map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDownloadTemplate(t)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Template {TYPE_LABELS[t]}
                </Button>
              ))}

              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  Untuk data referensi (Kelurahan, Asnaf, Program), Anda cukup mengetikkan <strong>namanya</strong> di dalam Excel. Sistem akan otomatis mencari ID-nya.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {previewResult && (
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    Preview {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    File: <strong>{file?.name}</strong> • Total baris: <strong>{previewResult.total}</strong>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetState} disabled={isLoading}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isLoading || previewResult.siap_import === 0}
                    className="gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Import {previewResult.siap_import} Baris Valid
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-md text-sm font-medium">
                  {previewResult.siap_import} Siap Import
                </div>
                {previewResult.bermasalah > 0 && (
                  <div className="bg-red-100 text-red-800 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {previewResult.bermasalah} Bermasalah
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="valid" className="w-full">
                <div className="px-6 py-2 border-b">
                  <TabsList>
                    <TabsTrigger value="valid">Contoh Valid ({previewResult.preview_valid.length})</TabsTrigger>
                    {previewResult.preview_invalid.length > 0 && (
                      <TabsTrigger value="invalid" className="text-red-600">
                        Error ({previewResult.preview_invalid.length})
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="valid" className="p-0 m-0">
                  {previewResult.preview_valid.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Tidak ada baris yang valid</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px]">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0">
                          <TableRow>
                            <TableHead className="w-16">Baris</TableHead>
                            {Object.keys(previewResult.preview_valid[0]?.data || {}).map((key) => (
                              <TableHead key={key} className="text-xs whitespace-nowrap">{key}</TableHead>
                            ))}
                            <TableHead className="text-xs">Catatan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewResult.preview_valid.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-xs text-muted-foreground">{item.row}</TableCell>
                              {Object.values(item.data).map((value: any, i: number) => (
                                <TableCell key={i} className="text-xs whitespace-nowrap">
                                  {value !== null && value !== undefined ? String(value) : '-'}
                                </TableCell>
                              ))}
                              <TableCell className="text-xs text-orange-600 max-w-[200px] truncate">
                                {item.koreksi_otomatis ? item.koreksi_otomatis.join(', ') : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="invalid" className="p-0 m-0">
                  <div className="overflow-x-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="bg-red-50 sticky top-0">
                        <TableRow>
                          <TableHead className="w-16 text-red-900">Baris</TableHead>
                          <TableHead className="text-red-900">Alasan Error</TableHead>
                          <TableHead className="text-red-900">Data Mentah Excel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResult.preview_invalid.map((item: any, idx: number) => (
                          <TableRow key={idx} className="bg-red-50/10">
                            <TableCell className="font-medium text-xs text-red-600">{item.row}</TableCell>
                            <TableCell className="text-xs text-red-600 max-w-md">
                              <ul className="list-disc list-inside">
                                {Object.entries(item.errors)
                                  .filter(([key]) => key !== '_errors')
                                  .map(([key, errObj]: [string, any]) => (
                                    <li key={key}>
                                      <strong>{key}</strong>: {errObj._errors?.join(', ') || 'Invalid'}
                                    </li>
                                  ))}
                              </ul>
                              {item.koreksi_otomatis && (
                                <div className="mt-2 text-orange-600">
                                  <strong>Koreksi:</strong> {item.koreksi_otomatis.join(', ')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs p-2">
                              <pre className="bg-muted p-2 rounded max-h-24 overflow-auto text-[10px]">
                                {JSON.stringify(item.data, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
