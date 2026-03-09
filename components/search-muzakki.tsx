'use client';

import { useState } from 'react';
import { muzakkiApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SearchMuzakkiProps {
  onSuccess: () => void;
}

export function SearchMuzakki({ onSuccess }: SearchMuzakkiProps) {
  const [searchType, setSearchType] = useState<'npwz' | 'nik' | 'nama'>('npwz');
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Masukkan nilai pencarian');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await muzakkiApi.list(searchValue, 1, 10);
      if (response.data && response.data.length > 0) {
        setResult(response.data[0]);
      } else {
        setError('Data Muzakki tidak ditemukan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencari data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Masukkan nilai pencarian..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cari
              </>
            ) : (
              'Cari'
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          {(['npwz', 'nik', 'nama'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                searchType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-green-900">Data Ditemukan</h3>
                <div className="grid gap-2 text-sm text-green-800">
                  <p><span className="font-medium">NPWZ:</span> {result.npwz || '-'}</p>
                  <p><span className="font-medium">Nama:</span> {result.nama}</p>
                  <p><span className="font-medium">NIK:</span> {result.nik || '-'}</p>
                  <p><span className="font-medium">No HP:</span> {result.no_hp}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
