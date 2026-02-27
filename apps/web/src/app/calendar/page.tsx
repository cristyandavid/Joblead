'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate, JOB_STATUS_COLORS, JOB_STATUS_LABELS, PRIORITY_COLORS } from '@/lib/utils';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

interface Job {
  id: string; title: string; status: string; priority: string;
  startDate?: string; endDate?: string;
  customer: { name: string };
  address: { city: string; province: string };
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Job[] }>('/jobs?limit=200').then((r) => {
      const scheduled = r.data.filter((j) =>
        j.startDate && ['APPROVED', 'SCHEDULED', 'IN_PROGRESS'].includes(j.status)
      ).sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
      setJobs(scheduled);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = new Date();
  const upcoming = jobs.filter((j) => j.startDate && new Date(j.startDate) >= today);
  const inProgress = jobs.filter((j) => j.status === 'IN_PROGRESS');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Scheduled and active jobs</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* In Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">In Progress ({inProgress.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-gray-400">Loading…</p> :
                inProgress.length === 0 ? <p className="text-sm text-gray-400">No jobs currently in progress.</p> :
                <div className="space-y-3">
                  {inProgress.map((j) => (
                    <Link key={j.id} href={`/jobs/${j.id}`}>
                      <div className="rounded-md border p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{j.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[j.priority]}`}>{j.priority}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{j.customer.name} · {j.address.city}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          {j.startDate && <span>Start: {formatDate(j.startDate)}</span>}
                          {j.endDate && <span>End: {formatDate(j.endDate)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              }
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Upcoming ({upcoming.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-gray-400">Loading…</p> :
                upcoming.length === 0 ? <p className="text-sm text-gray-400">No upcoming scheduled jobs.</p> :
                <div className="space-y-3">
                  {upcoming.map((j) => (
                    <Link key={j.id} href={`/jobs/${j.id}`}>
                      <div className="rounded-md border p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{j.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_COLORS[j.status]}`}>
                            {JOB_STATUS_LABELS[j.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{j.customer.name} · {j.address.city}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>Starts: {formatDate(j.startDate)}</span>
                          {j.endDate && <span>Ends: {formatDate(j.endDate)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              }
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
