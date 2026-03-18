import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { usersService } from '@/services/users.service';
import type { User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';

export default function UsersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [nonAdmins, setNonAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin !== true) return;

    Promise.all([usersService.getAdmins(), usersService.getNonAdmins()])
      .then(([a, na]) => {
        setAdmins(a);
        setNonAdmins(na);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error al cargar usuarios'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (authLoading) return null;
  if (isAdmin !== true) return <Navigate to="/admin" replace />;

  const UserTable = ({ users }: { users: User[] }) => (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Registrado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No hay usuarios.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {u.pictureUrl && (
                      <img src={u.pictureUrl} alt="" className="size-6 rounded-full" referrerPolicy="no-referrer" />
                    )}
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.isAdmin ? 'default' : 'secondary'}>
                    {u.isAdmin ? 'Admin' : 'Usuario'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(u.createdAt).toLocaleDateString('es-AR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Usuarios</h2>
        <p className="text-sm text-muted-foreground">Listado de usuarios registrados en el sistema.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <Tabs defaultValue="admins">
          <TabsList>
            <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
            <TabsTrigger value="users">Usuarios ({nonAdmins.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="admins" className="mt-4">
            <UserTable users={admins} />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UserTable users={nonAdmins} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
