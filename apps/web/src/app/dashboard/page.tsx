'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/utils';
import { Briefcase, Users, DollarSign, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalCustomers: number;
  outstandingCents: number;
}

interface RecentJob {
  id: string;
  title: string;
  status: string;
  customer: { name: string };
  priority: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [jobsRes, customersRes] = await Promise.all([
          api.get<{ data: RecentJob[]; meta: { total: number } }>('/jobs?limit=100'),
          api.get<{ data: unknown[]; meta: { total: number } }>('/customers?limit=1'),
        ]);

        const activeStatuses = ['LEAD', 'ESTIMATING', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS'];
        const activeJobs = jobsRes.data.filter((j) => activeStatuses.includes(j.status));

        setStats({
          totalJobs: jobsRes.meta.total,
          activeJobs: activeJobs.length,
          totalCustomers: customersRes.meta.total,
          outstandingCents: 0,
        });

        setRecentJobs(jobsRes.data.slice(0, 5));
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const statusColor: Record<string, string> = {
    LEAD: 'bg-gray-100 text-gray-700',
    ESTIMATING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    SCHEDULED: 'bg-purple-100 text-purple-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-green-100 text-green-700',
    INVOICED: 'bg-cyan-100 text-cyan-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    CANCELED: 'bg-red-100 text-red-700',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back. Here's what's happening.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold">{loading ? '…' : stats?.totalJobs}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-orange-100 p-3">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Jobs</p>
                <p className="text-2xl font-bold">{loading ? '…' : stats?.activeJobs}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-100 p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Customers</p>
                <p className="text-2xl font-bold">{loading ? '…' : stats?.totalCustomers}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-purple-100 p-3">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold">
                  {loading ? '…' : formatCents(stats?.outstandingCents ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Jobs</CardTitle>
            <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : recentJobs.length === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet.</p>
            ) : (
              <div className="divide-y">
                {recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.customer.name}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[job.status] ?? ''}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
