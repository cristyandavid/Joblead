'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface LineItem { name: string; description: string; qty: string; unit: string; unitPriceCents: string }

const emptyItem = (): LineItem => ({ name: '', description: '', qty: '1', unit: 'lot', unitPriceCents: '' });

export default function NewInvoicePage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function setItem(i: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function itemTotal(item: LineItem): number {
    return Math.round((parseFloat(item.qty) || 0) * (parseInt(item.unitPriceCents) || 0));
  }

  const subtotal = items.reduce((sum, it) => sum + itemTotal(it), 0);
  const tax = Math.round(subtotal * 0.13);
  const total = subtotal + tax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const inv = await api.post<{ id: string }>(`/jobs/${jobId}/invoices`, {
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes || undefined,
        lineItems: items.map((it) => ({
          name: it.name,
          description: it.description || undefined,
          qty: parseFloat(it.qty),
          unit: it.unit,
          unitPriceCents: parseInt(it.unitPriceCents) || 0,
        })),
      });
      router.push(`/jobs/${jobId}?tab=invoices`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/jobs/${jobId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Item Name *</Label>
                      <Input value={item.name} onChange={(e) => setItem(i, 'name', e.target.value)} required />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" value={item.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} min="0" step="0.01" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input value={item.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit Price (¢)</Label>
                      <Input type="number" value={item.unitPriceCents} onChange={(e) => setItem(i, 'unitPriceCents', e.target.value)} min="0" />
                    </div>
                    <div className="col-span-1 pt-5">
                      <p className="text-sm font-medium text-right">{formatCents(itemTotal(item))}</p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setItems(p => p.filter((_, j) => j !== i))} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setItems(p => [...p, emptyItem()])}>
                  <Plus className="mr-2 h-4 w-4" />Add Item
                </Button>
              </div>
              <div className="mt-6 border-t pt-4 text-right space-y-1">
                <p className="text-sm text-gray-500">Subtotal: {formatCents(subtotal)}</p>
                <p className="text-sm text-gray-500">HST (13%): {formatCents(tax)}</p>
                <p className="text-lg font-bold">Total: {formatCents(total)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} data-testid="save-invoice">{loading ? 'Saving…' : 'Create Invoice'}</Button>
            <Link href={`/jobs/${jobId}`}><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
