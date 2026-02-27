'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCents, formatDate, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/utils';
import Link from 'next/link';

interface Job {
  id: string; title: string; status: string; priority: string;
  totalEstimateCents: number; totalInvoiceCents: number; totalPaidCents: number;
  customer: { name: string };
}

export default function ReportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Job[] }>('/jobs?limit=500').then((r) => {
      setJobs(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const outstanding = jobs.filter((j) => j.totalInvoiceCents > j.totalPaidCents && j.status === 'INVOICED');
  const byStatus = Object.entries(
    jobs.reduce((acc: Record<string, number>, j) => {
      acc[j.status] = (acc[j.status] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const totalRevenue = jobs.filter(j => j.status === 'PAID').reduce((s, j) => s + j.totalPaidCents, 0);
  const totalOutstanding = outstanding.reduce((s, j) => s + (j.totalInvoiceCents - j.totalPaidCents), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Total Revenue (Paid)</p>
              <p className="text-2xl font-bold text-green-700">{formatCents(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Outstanding Invoices</p>
              <p className="text-2xl font-bold text-red-600">{formatCents(totalOutstanding)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-2xl font-bold">{jobs.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Jobs by status */}
          <Card>
            <CardHeader><CardTitle className="text-base">Jobs by Status</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
                <div className="space-y-2">
                  {byStatus.map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {JOB_STATUS_LABELS[status] ?? status}
                      </span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outstanding invoices */}
          <Card>
            <CardHeader><CardTitle className="text-base">Outstanding Invoices</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-gray-400">Loading…</p> : outstanding.length === 0 ? (
                <p className="text-sm text-gray-400">No outstanding invoices.</p>
              ) : (
                <div className="space-y-3">
                  {outstanding.map((j) => (
                    <Link key={j.id} href={`/jobs/${j.id}`} className="block hover:bg-gray-50 -mx-2 px-2 rounded">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">{j.title}</p>
                          <p className="text-xs text-gray-400">{j.customer.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">{formatCents(j.totalInvoiceCents - j.totalPaidCents)}</p>
                          <p className="text-xs text-gray-400">outstanding</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
