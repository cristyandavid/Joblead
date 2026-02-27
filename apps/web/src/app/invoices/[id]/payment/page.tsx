'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Invoice { id: string; jobId: string; invoiceNumber: string; totalCents: number; payments: { amountCents: number }[] }

export default function RecordPaymentPage() {
  const { id: invoiceId } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ amountCents: '', method: 'EMT', receivedAt: new Date().toISOString().split('T')[0], notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Invoice>(`/invoices/${invoiceId}`).then((inv) => {
      setInvoice(inv);
      const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
      const remaining = inv.totalCents - paid;
      setForm(f => ({ ...f, amountCents: (remaining / 100).toFixed(2) }));
    });
  }, [invoiceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post(`/invoices/${invoiceId}/payments`, {
        amountCents: Math.round(parseFloat(form.amountCents) * 100),
        method: form.method,
        receivedAt: new Date(form.receivedAt).toISOString(),
        notes: form.notes || undefined,
      });
      router.push(`/jobs/${invoice!.jobId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  if (!invoice) return <DashboardLayout><div className="flex justify-center py-32"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div></DashboardLayout>;

  const paid = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
  const remaining = invoice.totalCents - paid;

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/jobs/${invoice.jobId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
        </div>

        <Card>
          <CardContent className="p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span className="font-medium">{invoice.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total</span><span>{formatCents(invoice.totalCents)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Already paid</span><span>{formatCents(paid)}</span></div>
            <div className="flex justify-between font-semibold"><span>Remaining</span><span className="text-red-600">{formatCents(remaining)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount ($) *</Label>
                <Input type="number" value={form.amountCents} onChange={(e) => setForm(f => ({ ...f, amountCents: e.target.value }))} min="0.01" step="0.01" required data-testid="payment-amount" />
              </div>
              <div className="space-y-2">
                <Label>Method *</Label>
                <Select value={form.method} onValueChange={(v) => setForm(f => ({ ...f, method: v }))}>
                  <SelectTrigger data-testid="payment-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="EMT">EMT / e-Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="CREDIT">Credit Card</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Received *</Label>
                <Input type="date" value={form.receivedAt} onChange={(e) => setForm(f => ({ ...f, receivedAt: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Cheque #, reference…" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} data-testid="submit-payment">{loading ? 'Saving…' : 'Record Payment'}</Button>
                <Link href={`/jobs/${invoice.jobId}`}><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
