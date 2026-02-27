'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import {
  formatCents, formatDate, formatDateTime,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, PRIORITY_COLORS, INVOICE_STATUS_COLORS,
} from '@/lib/utils';
import { ArrowLeft, Plus, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { isValidStatusTransition, JobStatus } from '@joblead/shared';

interface LineItem { id: string; name: string; qty: number; unit: string; unitPriceCents: number; totalCents: number; description?: string }
interface Estimate { id: string; versionNumber: number; status: string; totalCents: number; subtotalCents: number; taxCents: number; notes?: string; lineItems: LineItem[]; createdAt: string }
interface Payment { id: string; amountCents: number; method: string; receivedAt: string; notes?: string }
interface Invoice { id: string; invoiceNumber: string; status: string; totalCents: number; subtotalCents: number; taxCents: number; dueDate?: string; lineItems: LineItem[]; payments: Payment[]; createdAt: string }
interface JobEvent { id: string; type: string; message: string; fromStatus?: string; toStatus?: string; createdAt: string; createdBy: { name: string } }
interface FileAtt { id: string; filename: string; url: string; mimeType: string; sizeBytes: number; createdAt: string; uploadedBy: { name: string } }

interface Job {
  id: string; title: string; description?: string; status: string; priority: string;
  startDate?: string; endDate?: string;
  depositRequired: boolean; depositAmount?: number;
  totalEstimateCents: number; totalInvoiceCents: number; totalPaidCents: number;
  createdAt: string; updatedAt: string;
  customer: { id: string; name: string; phone: string; email?: string };
  address: { street: string; city: string; province: string; postalCode: string };
  createdBy: { name: string };
  estimates: Estimate[];
  invoices: Invoice[];
  events: JobEvent[];
  files: FileAtt[];
}

const ALL_STATUSES = Object.values(JobStatus);

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isManager } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(() => {
    api.get<Job>(`/jobs/${id}`).then(setJob).catch(() => router.push('/jobs'));
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(newStatus: string) {
    setStatusLoading(true);
    try {
      await api.post(`/jobs/${id}/status`, { status: newStatus });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setStatusLoading(false);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/jobs/${id}/notes`, { message: noteText });
      setNoteText('');
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSavingNote(false);
    }
  }

  async function sendEstimate(estimateId: string) {
    await api.post(`/estimates/${estimateId}/send`);
    load();
  }

  async function acceptEstimate(estimateId: string) {
    await api.post(`/estimates/${estimateId}/accept`);
    load();
  }

  async function sendInvoice(invoiceId: string) {
    await api.post(`/invoices/${invoiceId}/send`);
    load();
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const validNextStatuses = ALL_STATUSES.filter((s) =>
    isValidStatusTransition(job.status as JobStatus, s),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href="/jobs"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {job.customer.name} · {job.address.city}, {job.address.province}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${JOB_STATUS_COLORS[job.status]}`}>
              {JOB_STATUS_LABELS[job.status]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[job.priority]}`}>
              {job.priority}
            </span>
          </div>
        </div>

        {/* Status change */}
        {isManager && validNextStatuses.length > 0 && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <span className="text-sm text-gray-500">Move to:</span>
              <div className="flex flex-wrap gap-2">
                {validNextStatuses.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    disabled={statusLoading}
                    onClick={() => changeStatus(s)}
                    className={JOB_STATUS_COLORS[s]}
                  >
                    {JOB_STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="estimates">Estimates ({job.estimates.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({job.invoices.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({job.files.length})</TabsTrigger>
            <TabsTrigger value="history">History ({job.events.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {job.description && <p className="text-gray-600">{job.description}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-gray-400">Start</p><p>{formatDate(job.startDate)}</p></div>
                    <div><p className="text-xs text-gray-400">End</p><p>{formatDate(job.endDate)}</p></div>
                    <div><p className="text-xs text-gray-400">Created</p><p>{formatDate(job.createdAt)}</p></div>
                    <div><p className="text-xs text-gray-400">By</p><p>{job.createdBy.name}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Financials</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Estimate</span><span className="font-medium">{formatCents(job.totalEstimateCents)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Invoiced</span><span className="font-medium">{formatCents(job.totalInvoiceCents)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Paid</span><span className="font-semibold text-green-700">{formatCents(job.totalPaidCents)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-semibold text-red-600">{formatCents(job.totalInvoiceCents - job.totalPaidCents)}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <Link href={`/customers/${job.customer.id}`} className="text-blue-600 hover:underline font-medium">{job.customer.name}</Link>
                  <p className="text-gray-500">{job.customer.phone}</p>
                  {job.customer.email && <p className="text-gray-500">{job.customer.email}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p>{job.address.street}</p>
                  <p className="text-gray-500">{job.address.city}, {job.address.province} {job.address.postalCode}</p>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Add Note</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submitNote} className="space-y-3">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this job…"
                    rows={3}
                    data-testid="note-textarea"
                  />
                  <Button type="submit" size="sm" disabled={savingNote || !noteText.trim()}>
                    {savingNote ? 'Saving…' : 'Add Note'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimates */}
          <TabsContent value="estimates">
            <div className="space-y-4">
              {isManager && (
                <Link href={`/jobs/${id}/estimates/new`}>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Estimate</Button>
                </Link>
              )}
              {job.estimates.map((est) => (
                <Card key={est.id}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-base">Estimate v{est.versionNumber}</CardTitle>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(est.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        est.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        est.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                        est.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{est.status}</span>
                      {isManager && est.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => sendEstimate(est.id)}>
                          <Send className="mr-1 h-3 w-3" />Send
                        </Button>
                      )}
                      {isManager && (est.status === 'SENT' || est.status === 'DRAFT') && (
                        <Button size="sm" onClick={() => acceptEstimate(est.id)} data-testid="accept-estimate">Accept</Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs text-gray-400">
                        <th className="pb-2">Item</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit Price</th><th className="pb-2 text-right">Total</th>
                      </tr></thead>
                      <tbody>
                        {est.lineItems.map((li) => (
                          <tr key={li.id} className="border-b">
                            <td className="py-2">{li.name}</td>
                            <td className="py-2 text-right">{li.qty} {li.unit}</td>
                            <td className="py-2 text-right">{formatCents(li.unitPriceCents)}</td>
                            <td className="py-2 text-right font-medium">{formatCents(li.totalCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 space-y-1 text-right text-sm">
                      <p className="text-gray-500">Subtotal: {formatCents(est.subtotalCents)}</p>
                      <p className="text-gray-500">HST (13%): {formatCents(est.taxCents)}</p>
                      <p className="font-bold text-base">Total: {formatCents(est.totalCents)}</p>
                    </div>
                    {est.notes && <p className="mt-3 text-xs text-gray-400">{est.notes}</p>}
                  </CardContent>
                </Card>
              ))}
              {job.estimates.length === 0 && <p className="text-sm text-gray-400">No estimates yet.</p>}
            </div>
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices">
            <div className="space-y-4">
              {isManager && (
                <Link href={`/jobs/${id}/invoices/new`}>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Invoice</Button>
                </Link>
              )}
              {job.invoices.map((inv) => (
                <Card key={inv.id}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-base">{inv.invoiceNumber}</CardTitle>
                      <p className="text-xs text-gray-400">{formatDate(inv.createdAt)} {inv.dueDate ? `· Due ${formatDate(inv.dueDate)}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? ''}`}>{inv.status}</span>
                      {isManager && inv.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => sendInvoice(inv.id)}><Send className="mr-1 h-3 w-3" />Send</Button>
                      )}
                      {isManager && inv.status !== 'PAID' && inv.status !== 'VOID' && (
                        <Link href={`/invoices/${inv.id}/payment`}><Button size="sm" data-testid="record-payment">Record Payment</Button></Link>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs text-gray-400">
                        <th className="pb-2">Item</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit Price</th><th className="pb-2 text-right">Total</th>
                      </tr></thead>
                      <tbody>
                        {inv.lineItems.map((li) => (
                          <tr key={li.id} className="border-b">
                            <td className="py-2">{li.name}</td>
                            <td className="py-2 text-right">{li.qty} {li.unit}</td>
                            <td className="py-2 text-right">{formatCents(li.unitPriceCents)}</td>
                            <td className="py-2 text-right">{formatCents(li.totalCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 space-y-1 text-right">
                      <p className="text-gray-500 text-sm">HST (13%): {formatCents(inv.taxCents)}</p>
                      <p className="font-bold">Total: {formatCents(inv.totalCents)}</p>
                    </div>
                    {inv.payments.length > 0 && (
                      <div className="mt-4 space-y-1">
                        <p className="text-xs font-medium text-gray-500">Payments:</p>
                        {inv.payments.map((p) => (
                          <div key={p.id} className="flex justify-between text-xs text-gray-600">
                            <span>{formatDate(p.receivedAt)} via {p.method}</span>
                            <span className="font-medium text-green-700">{formatCents(p.amountCents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {job.invoices.length === 0 && <p className="text-sm text-gray-400">No invoices yet.</p>}
            </div>
          </TabsContent>

          {/* Files */}
          <TabsContent value="files">
            <div className="space-y-4">
              <div>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-gray-400">
                    <p className="text-sm text-gray-500">Click to upload a file (max 20MB)</p>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        try {
                          await api.upload(`/jobs/${id}/files`, fd);
                          load();
                        } catch {}
                      }}
                    />
                  </div>
                </label>
              </div>
              {job.files.length === 0 ? (
                <p className="text-sm text-gray-400">No files attached yet.</p>
              ) : (
                <div className="grid gap-2">
                  {job.files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{f.filename}</p>
                        <p className="text-xs text-gray-400">{f.uploadedBy.name} · {formatDate(f.createdAt)} · {Math.round(f.sizeBytes / 1024)}KB</p>
                      </div>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <div className="space-y-3">
              {job.events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{ev.message}</p>
                    <p className="text-xs text-gray-400">{ev.createdBy.name} · {formatDateTime(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
              {job.events.length === 0 && <p className="text-sm text-gray-400">No history yet.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
