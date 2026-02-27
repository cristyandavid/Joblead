'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

interface Customer { id: string; name: string; addresses: { id: string; label?: string; street: string; city: string }[] }

export default function NewJobPage() {
  const router = useRouter();
  const params = useSearchParams();
  const preselectedCustomerId = params.get('customerId') ?? '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    customerId: preselectedCustomerId,
    addressId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    depositRequired: false,
    depositAmount: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ data: Customer[] }>('/customers?limit=200').then((r) => {
      setCustomers(r.data);
      if (preselectedCustomerId) {
        const c = r.data.find((c) => c.id === preselectedCustomerId);
        setSelectedCustomer(c ?? null);
      }
    });
  }, [preselectedCustomerId]);

  function handleCustomerChange(id: string) {
    const c = customers.find((c) => c.id === id);
    setSelectedCustomer(c ?? null);
    setForm((f) => ({ ...f, customerId: id, addressId: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.addressId) { setError('Please select an address'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = {
        customerId: form.customerId,
        addressId: form.addressId,
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        depositRequired: form.depositRequired,
        depositAmount: form.depositRequired && form.depositAmount ? Math.round(parseFloat(form.depositAmount) * 100) : undefined,
      };
      const job = await api.post<{ id: string }>('/jobs', body);
      router.push(`/jobs/${job.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/jobs"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Customer */}
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger data-testid="customer-select"><SelectValue placeholder="Select customer…" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Address */}
              {selectedCustomer && (
                <div className="space-y-2">
                  <Label>Service Address *</Label>
                  <Select value={form.addressId} onValueChange={(v) => setForm(f => ({ ...f, addressId: v }))}>
                    <SelectTrigger data-testid="address-select"><SelectValue placeholder="Select address…" /></SelectTrigger>
                    <SelectContent>
                      {selectedCustomer.addresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label ? `${a.label} – ` : ''}{a.street}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Basement Renovation" data-testid="job-title" />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Scope of work…" />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deposit */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="deposit"
                  checked={form.depositRequired}
                  onChange={(e) => setForm(f => ({ ...f, depositRequired: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="deposit">Deposit required</Label>
              </div>
              {form.depositRequired && (
                <div className="space-y-2">
                  <Label>Deposit Amount ($)</Label>
                  <Input type="number" value={form.depositAmount} onChange={(e) => setForm(f => ({ ...f, depositAmount: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading || !form.customerId} data-testid="save-job">
                  {loading ? 'Creating…' : 'Create Job'}
                </Button>
                <Link href="/jobs"><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
