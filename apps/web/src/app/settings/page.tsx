'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface User { id: string; name: string; email: string; role: string; createdAt: string }

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CREW' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAdmin) {
      api.get<User[]>('/users').then(setUsers).catch(() => {});
    }
  }, [isAdmin]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post('/auth/register', form);
      setSuccess('User created successfully.');
      setForm({ name: '', email: '', password: '', role: 'CREW' });
      setShowNew(false);
      api.get<User[]>('/users').then(setUsers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">My Profile</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400">Name</p><p className="font-medium">{user?.name}</p></div>
              <div><p className="text-xs text-gray-400">Email</p><p className="font-medium">{user?.email}</p></div>
              <div><p className="text-xs text-gray-400">Role</p><p className="font-medium">{user?.role}</p></div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Users</CardTitle>
              <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="mr-2 h-4 w-4" />New User</Button>
            </CardHeader>
            <CardContent>
              {showNew && (
                <form onSubmit={createUser} className="mb-6 rounded-md border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
                    <div className="space-y-1"><Label className="text-xs">Password</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="CREW">Crew</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  {success && <p className="text-sm text-green-600">{success}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>{loading ? 'Creating…' : 'Create User'}</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
