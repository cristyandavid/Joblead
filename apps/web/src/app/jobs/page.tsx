'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatCents } from '@/lib/utils';
import { Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { JobStatus } from '@joblead/shared';

interface Job {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  customer: { id: string; name: string };
  address: { street: string; city: string };
  totalEstimateCents: number;
}

const KANBAN_COLUMNS: JobStatus[] = [
  JobStatus.LEAD, JobStatus.ESTIMATING, JobStatus.APPROVED,
  JobStatus.SCHEDULED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED,
  JobStatus.INVOICED, JobStatus.PAID,
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const { isManager } = useAuth();

  useEffect(() => {
    api.get<{ data: Job[] }>('/jobs?limit=200').then((r) => {
      setJobs(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const byStatus = (status: string) => jobs.filter((j) => j.status === status);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">{jobs.length} job(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-1.5 ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >Kanban</button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >List</button>
            </div>
            {isManager && (
              <Link href="/jobs/new">
                <Button><Plus className="mr-2 h-4 w-4" />New Job</Button>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : view === 'kanban' ? (
          /* Kanban board */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((status) => {
              const colJobs = byStatus(status);
              return (
                <div key={status} className="min-w-[220px] flex-shrink-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${JOB_STATUS_COLORS[status]}`}>
                      {JOB_STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs text-gray-400">{colJobs.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colJobs.map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <Card className="cursor-pointer transition-shadow hover:shadow-md">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{job.title}</p>
                            <p className="mt-1 text-xs text-gray-500">{job.customer.name}</p>
                            <p className="text-xs text-gray-400">{job.address.city}</p>
                            {job.totalEstimateCents > 0 && (
                              <p className="mt-2 text-xs font-medium text-green-700">{formatCents(job.totalEstimateCents)}</p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {colJobs.length === 0 && (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-gray-400">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <p className="text-gray-500">No jobs yet.</p>
                  {isManager && <Link href="/jobs/new" className="mt-4"><Button>Create your first job</Button></Link>}
                </CardContent>
              </Card>
            ) : jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-500">{job.customer.name} · {job.address.city}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.totalEstimateCents > 0 && (
                        <span className="text-sm font-medium text-gray-700">{formatCents(job.totalEstimateCents)}</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_COLORS[job.status] ?? ''}`}>
                        {JOB_STATUS_LABELS[job.status]}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
