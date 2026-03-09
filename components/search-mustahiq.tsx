'use client';

import { useState } from 'react';
import { mustahiqApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search } from 'lucide-react';

interface SearchMustahiqProps {
  onSuccess: () => void;
}

export function SearchMustahiq({ onSuccess }: SearchMustahiqProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Masukkan nilai pencarian');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);
    setSearched(false);

    try {
      const response = await mustahiqApi.list({ q: searchValue.trim(), page: 1, limit: 10 });
      const data = Array.isArray(response.data) ? response.data : [];
      setResults(data);
      setSearched(true);
      if (data.length === 0) setError('Data Mustahiq tidak ditemukan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencari data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Cari nama, NRM, atau NIK..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          disabled={isLoading}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {searched && results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((m) => (
            <div key={m.id} className="border rounded-md p-3 text-sm space-y-1">
              <div className="font-semibold">{m.nama}</div>
              <div className="text-muted-foreground">NRM: {m.nrm || '-'} | NIK: {m.nik || '-'}</div>
              <div className="text-muted-foreground">No HP: {m.no_hp || '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
