/**
 * Admin Page
 * Material management and system administration
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import {
  useMaterials,
  useDeleteMaterial
} from '../hooks/usePlateStock'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from '../hooks/useUsers'
import type { Material, UserAdminResponse } from '../types/database'
import { Plus, Trash2, Loader2, Settings, Palette, MapPin, ChevronRight, Edit2, Users, UserX, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AddMaterialModal } from '../components/AddMaterialModal'
import { getRoleName } from '../types/roles'
import type { UserRole } from '../types/roles'

const ALL_ROLES: UserRole[] = [
  'admin', 'werkvoorbereider', 'werkplaats', 'logistiek',
  'tekenaar', 'laser', 'buislaser', 'kantbank',
]

function UserFormDialog({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: UserAdminResponse | null
}) {
  const isEdit = user !== null
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>((user?.role as UserRole) ?? 'werkplaats')

  // Reset form when dialog opens with a different user
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim() || (!isEdit && !password)) return

    if (isEdit) {
      const data: Record<string, string> = {}
      if (fullName !== user.full_name) data.full_name = fullName
      if (email !== user.email) data.email = email
      if (password) data.password = password
      if (role !== user.role) data.role = role
      updateUser.mutate({ id: user.id, data }, { onSuccess: onClose })
    } else {
      createUser.mutate({ full_name: fullName, email, password, role }, { onSuccess: onClose })
    }
  }

  const isPending = createUser.isPending || updateUser.isPending
  const isValid = fullName.trim() && email.trim() && (isEdit || password.length >= 8)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Gebruiker bewerken' : 'Gebruiker aanmaken'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Pas de gegevens aan voor ${user.full_name}.` : 'Vul de gegevens in voor de nieuwe gebruiker.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Naam</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Voornaam Achternaam"
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mailadres</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="naam@kersten.nl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? 'Nieuw wachtwoord (optioneel)' : 'Wachtwoord'}</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? 'Laat leeg om niet te wijzigen' : 'Minimaal 8 tekens'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={v => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{getRoleName(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Annuleren</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Opslaan' : 'Aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Admin() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editMaterial, setEditMaterial] = useState<Material | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserAdminResponse | null>(null)

  const { data: materials, isLoading } = useMaterials()
  const deleteMaterial = useDeleteMaterial()

  const { data: users, isLoading: usersLoading } = useUsers()
  const deactivateUser = useDeactivateUser()

  const openCreateUser = () => {
    setEditUser(null)
    setUserDialogOpen(true)
  }

  const openEditUser = (user: UserAdminResponse) => {
    setEditUser(user)
    setUserDialogOpen(true)
  }

  const handleDeactivate = (user: UserAdminResponse) => {
    if (!confirm(`Gebruiker ${user.full_name} deactiveren?`)) return
    deactivateUser.mutate(user.id)
  }


  const handleEdit = (material: Material) => {
    setEditMaterial(material)
    setEditModalOpen(true)
  }

  const handleDelete = async (material: Material) => {
    if (!confirm(`Weet je zeker dat je ${material.materiaalgroep} ${material.oppervlaktebewerking} wilt verwijderen?`)) {
      return
    }

    deleteMaterial.mutate(material.id, {
      onSuccess: () => {
        toast.success('Materiaal verwijderd')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Fout bij verwijderen materiaal')
      }
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-gray-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Systeembeheer</h1>
              <p className="text-sm text-gray-600 mt-1">Gebruikers, materialen en instellingen</p>
            </div>
          </div>
        </div>

        {/* Admin Sections Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/storage-locations" className="group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Locatiebeheer</h3>
                      <p className="text-sm text-gray-600">Opslaglocaties beheren</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Gebruikersbeheer Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <CardTitle>Gebruikers</CardTitle>
              </div>
              <Button onClick={openCreateUser}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Gebruiker
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="h-14">
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="h-14 group">
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getRoleName(user.role as UserRole)}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Actief</Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500">Inactief</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => openEditUser(user)}>
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          {user.is_active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(user)}
                              disabled={deactivateUser.isPending}
                            >
                              <UserX className="w-4 h-4 text-red-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditUser(user)}
                            >
                              <UserCheck className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nog geen gebruikers</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Materials Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-600" />
                <CardTitle>Materialen</CardTitle>
              </div>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Materiaal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : materials && materials.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="h-14">
                    <TableHead>Prefix</TableHead>
                    <TableHead>Materiaalgroep</TableHead>
                    <TableHead>Specificatie</TableHead>
                    <TableHead>Oppervlaktebewerking</TableHead>
                    <TableHead>Kleur</TableHead>
                    <TableHead>Platen</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id} className="h-14 group">
                      <TableCell className="font-mono font-medium">
                        {material.plaatcode_prefix}
                      </TableCell>
                      <TableCell>{material.materiaalgroep}</TableCell>
                      <TableCell>
                        {material.specificatie || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {material.oppervlaktebewerking}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: material.kleur }}
                          />
                          <span className="font-mono text-sm text-gray-600">
                            {material.kleur}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(material.plate_count || 0) === 1 ? '1 plaat' : `${material.plate_count || 0} platen`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(material)}
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(material)}
                            disabled={deleteMaterial.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nog geen materialen toegevoegd</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Material Modal */}
      <AddMaterialModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />

      {/* Edit Material Modal */}
      <AddMaterialModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditMaterial(null)
        }}
        material={editMaterial}
      />

      {/* User Create/Edit Dialog */}
      <UserFormDialog
        open={userDialogOpen}
        onClose={() => {
          setUserDialogOpen(false)
          setEditUser(null)
        }}
        user={editUser}
      />
    </Layout>
  )
}
