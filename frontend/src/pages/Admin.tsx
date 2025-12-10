/**
 * Admin Page
 * Material management and system administration
 */

import { useState } from 'react'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
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
import type { Material } from '../types/database'
import { Plus, Trash2, Loader2, Settings, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { AddMaterialModal } from '../components/AddMaterialModal'

export function Admin() {
  const [addModalOpen, setAddModalOpen] = useState(false)

  const { data: materials, isLoading } = useMaterials()
  const deleteMaterial = useDeleteMaterial()


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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Systeembeheer</h1>
              <p className="text-gray-600">Materialen en instellingen</p>
            </div>
          </div>
        </div>

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
                  <TableRow>
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
                    <TableRow key={material.id}>
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
                          {material.plate_count || 0} platen
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(material)}
                          disabled={deleteMaterial.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
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
    </Layout>
  )
}
