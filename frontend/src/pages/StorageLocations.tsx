import { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  useStorageLocations,
  useCreateStorageLocation,
  useUpdateStorageLocation,
  useDeleteStorageLocation,
  type StorageLocation,
} from '../hooks/useStorageLocations';

export function StorageLocations() {
  const { isAdmin } = usePermissions();
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<StorageLocation | null>(null);

  // Form state
  const [naam, setNaam] = useState('');
  const [beschrijving, setBeschrijving] = useState('');

  const { data: locations, isLoading } = useStorageLocations(showInactive);
  const createMutation = useCreateStorageLocation();
  const updateMutation = useUpdateStorageLocation();
  const deleteMutation = useDeleteStorageLocation();

  // Check if user is admin
  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Toegang geweigerd</h2>
            <p className="text-gray-600">Je hebt geen toegang tot locatiebeheer.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const openCreateDialog = () => {
    setEditingLocation(null);
    setNaam('');
    setBeschrijving('');
    setDialogOpen(true);
  };

  const openEditDialog = (location: StorageLocation) => {
    setEditingLocation(location);
    setNaam(location.naam);
    setBeschrijving(location.beschrijving || '');
    setDialogOpen(true);
  };

  const openDeleteDialog = (location: StorageLocation) => {
    setDeletingLocation(location);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingLocation) {
      // Update existing location
      await updateMutation.mutateAsync({
        id: editingLocation.id,
        data: {
          naam: naam.trim(),
          beschrijving: beschrijving.trim() || undefined,
        },
      });
    } else {
      // Create new location
      await createMutation.mutateAsync({
        naam: naam.trim(),
        beschrijving: beschrijving.trim() || undefined,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingLocation) {
      await deleteMutation.mutateAsync(deletingLocation.id);
      setDeleteDialogOpen(false);
      setDeletingLocation(null);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Locatiebeheer</h1>
            <p className="text-sm text-gray-600 mt-1">
              Beheer opslaglocaties voor plaatmateriaal
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Locatie
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Toon inactieve locaties
          </label>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Naam</TableHead>
                  <TableHead className="font-semibold text-gray-900">Beschrijving</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Aangemaakt</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations && locations.length > 0 ? (
                  locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.naam}</TableCell>
                      <TableCell className="text-gray-600">
                        {location.beschrijving || '-'}
                      </TableCell>
                      <TableCell>
                        {location.actief ? (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            Actief
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-gray-200 bg-gray-50 text-gray-600"
                          >
                            Inactief
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(location.created_at).toLocaleDateString('nl-NL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(location)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(location)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      Geen locaties gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Locatie Bewerken' : 'Nieuwe Locatie'}
              </DialogTitle>
              <DialogDescription>
                {editingLocation
                  ? 'Wijzig de gegevens van de opslaglocatie.'
                  : 'Voeg een nieuwe opslaglocatie toe.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="naam" className="text-sm font-medium">
                  Naam *
                </label>
                <Input
                  id="naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="bijv. Hal A-1"
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="beschrijving" className="text-sm font-medium">
                  Beschrijving (optioneel)
                </label>
                <Textarea
                  id="beschrijving"
                  value={beschrijving}
                  onChange={(e) => setBeschrijving(e.target.value)}
                  placeholder="Optionele beschrijving van de locatie"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting || !naam.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLocation ? 'Bijwerken' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Locatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je de locatie "{deletingLocation?.naam}" wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
