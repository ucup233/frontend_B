'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DistribusiStatistikPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Statistik Distribusi</h1>
          <p className="text-muted-foreground text-sm">Ringkasan penyaluran dana zakat dan infak</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Statistik Penyaluran</CardTitle>
            <CardDescription>Visualisasi data distribusi dana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center text-muted-foreground h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
              Fitur Statistik Distribusi akan segera hadir.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
