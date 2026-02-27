'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Plus, Search, Phone, Mail, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  createdAt: string;
  _count: { jobs: number; addresses: number };
}

interface PaginatedCustomers {
  data: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { isManager } = useAuth();

  async function load(q = '') {
    setLoading(true);
    try {
      const res = await api.get<PaginatedCustomers>(`/customers?search=${encodeURIComponent(q)}&limit=50`);
      setCustomers(res.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-1">{customers.length} customer(s)</p>
          </div>
          {isManager && (
            <Link href="/customers/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Customer
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email or phone…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>

        {/* List */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <p className="text-gray-500">No customers found.</p>
              {isManager && (
                <Link href="/customers/new" className="mt-4">
                  <Button>Add your first customer</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {customers.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        {c.companyName && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" /> {c.companyName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {c.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{c._count.jobs} job(s)</p>
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
