'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, JOB_STATUS_COLORS, JOB_STATUS_LABELS } from '@/lib/utils';
import { ArrowLeft, Edit, Plus, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Address {
  id: string;
  label?: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  createdAt: string;
  addresses: Address[];
  jobs: Job[];
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isManager } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', companyName: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Customer>(`/customers/${id}`).then((c) => {
      setCustomer(c);
      setForm({ name: c.name, phone: c.phone, email: c.email ?? '', companyName: c.companyName ?? '' });
    }).catch(() => router.push('/customers'));
  }, [id, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch<Customer>(`/customers/${id}`, {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        companyName: form.companyName || undefined,
      });
      setCustomer(updated);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">{customer.companyName ?? 'Individual'} · Since {formatDate(customer.createdAt)}</p>
          </div>
          {isManager && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>

        {/* Edit form */}
        {editing ? (
          <Card>
            <CardHeader><CardTitle>Edit Customer</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input value={form.companyName} onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))} />
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-6">
              <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{customer.phone}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{customer.email ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">Company</p><p className="font-medium">{customer.companyName ?? '—'}</p></div>
            </CardContent>
          </Card>
        )}

        {/* Addresses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-gray-400">No addresses yet.</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-md border p-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      {a.label && <p className="text-xs font-medium text-gray-500">{a.label}</p>}
                      <p className="text-sm">{a.street}, {a.city}, {a.province} {a.postalCode}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Jobs</CardTitle>
            {isManager && (
              <Link href={`/jobs/new?customerId=${id}`}>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Job</Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {customer.jobs.length === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet.</p>
            ) : (
              <div className="divide-y">
                {customer.jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <p className="text-sm font-medium">{job.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_COLORS[job.status] ?? ''}`}>
                      {JOB_STATUS_LABELS[job.status] ?? job.status}
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
