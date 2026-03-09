'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userApi, UserRole } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, UserPlus, Shield } from 'lucide-react';

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        nama: '',
        role: 'pelayanan' as UserRole
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await userApi.list();
            if (res.success && res.data) {
                setUsers(res.data.users || []);
            }
        } catch (err) {
            toast.error('Gagal mengambil data user');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '', // Jangan tampilkan password lama
            nama: user.nama,
            role: user.role
        });
        setOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;

        try {
            const res = await userApi.delete(id);
            toast.success('User berhasil dihapus');
            fetchUsers();
        } catch (err) {
            toast.error('Gagal menghapus user');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingUser) {
                const payload = { ...formData };
                if (!payload.password) delete (payload as any).password;
                await userApi.update(editingUser.id, payload);
                toast.success('User berhasil diupdate');
            } else {
                await userApi.create(formData);
                toast.success('User berhasil ditambahkan');
            }
            setOpen(false);
            resetForm();
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'Gagal menyimpan data user');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            nama: '',
            role: 'pelayanan'
        });
        setEditingUser(null);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
                        <p className="text-muted-foreground">Kelola akun pengguna dan hak akses sistem.</p>
                    </div>
                    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <UserPlus className="h-4 w-4" /> Tambah User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
                                <DialogDescription>
                                    Isi formulir di bawah ini untuk {editingUser ? 'mengupdate' : 'menambahkan'} user.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nama Lengkap</label>
                                    <Input
                                        value={formData.nama}
                                        onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                        placeholder="Masukkan nama lengkap"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Username</label>
                                    <Input
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="Masukkan username"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password {editingUser && '(Kosongkan jika tidak ingin mengubah)'}</label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Masukkan password"
                                        required={!editingUser}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role</label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(val: any) => setFormData({ ...formData, role: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="superadmin">Superadmin</SelectItem>
                                            <SelectItem value="pelayanan">Pelayanan</SelectItem>
                                            <SelectItem value="pendistribusian">Pendistribusian</SelectItem>
                                            <SelectItem value="penerimaan">Penerimaan</SelectItem>
                                            <SelectItem value="keuangan">Keuangan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="submit" disabled={submitting} className="w-full">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {editingUser ? 'Simpan Perubahan' : 'Tambah User'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar User</CardTitle>
                        <CardDescription>Menampilkan seluruh akun yang terdaftar dalam sistem.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex h-40 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    Tidak ada data user.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">{user.nama}</TableCell>
                                                    <TableCell>{user.username}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {user.role === 'superadmin' && <Shield className="h-3 w-3 text-red-500" />}
                                                            <span className="capitalize">{user.role}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="outline" size="icon" onClick={() => handleEdit(user)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(user.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
