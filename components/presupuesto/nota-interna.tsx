'use client'

import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button, Card, CardBody, CardHeader, CardTitle, Kbd, Textarea } from '@/components/ui'
import { guardarNotaInterna } from '@/app/actions/seguimiento'

/**
 * Nota interna del presupuesto.
 *
 * Es el único texto de la pantalla que se pisa: sirve para el "acordate
 * de que labura de noche", no para el historial. Cada guardado igual
 * deja su evento en el timeline, así que lo que se cambió no se pierde
 * aunque el campo se sobrescriba.
 *
 * No sale en el PDF: es para el consultorio, no para el paciente.
 */
export function NotaInterna({
  presupuestoId,
  nota,
}: {
  presupuestoId: string
  nota: string | null
}) {
  const router = useRouter()
  const [editando, setEditando] = React.useState(false)
  const [texto, setTexto] = React.useState(nota ?? '')

  /**
   * Lo guardado se ve al toque.
   *
   * El texto que se muestra es la prop del servidor, y ésa recién
   * cambia cuando vuelve el `router.refresh()`. Sin esto, al cerrar el
   * editor la nota vieja reaparecía por un instante y parecía que el
   * guardado no había entrado. `useOptimistic` sostiene el valor nuevo
   * hasta que llega el real —y lo suelta solo si algo falla—.
   */
  const [notaVisible, proyectarNota] = React.useOptimistic(nota)
  const [guardando, iniciarGuardado] = React.useTransition()

  /**
   * El textarea se siembra al entrar en edición, no con un efecto que
   * sincroniza la prop.
   *
   * Fuera de edición lo que se muestra es `nota` (la prop del
   * servidor), así que `texto` no necesita seguirla: alcanza con
   * partir del valor vigente en el momento de tocar «Editar». De paso,
   * si el servidor revalida mientras alguien escribe, no le pisa lo
   * que estaba tipeando.
   */
  function editar() {
    setTexto(nota ?? '')
    setEditando(true)
  }

  function guardar() {
    if (guardando) return
    const limpio = texto.trim() || null

    iniciarGuardado(async () => {
      proyectarNota(limpio)
      try {
        const res = await guardarNotaInterna(presupuestoId, texto)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        // El aviso es un guardado a medias —la nota entró, el evento
        // no—: se cuenta como está, no como éxito ni como fracaso.
        if (res.aviso) toast.error(res.aviso)
        else toast.success(limpio ? 'Nota guardada.' : 'Nota borrada.')
        setEditando(false)
        router.refresh()
      } catch {
        toast.error('No se pudo guardar la nota. Fijate la conexión y probá de nuevo.')
      }
    })
  }

  function cancelar() {
    setTexto(nota ?? '')
    setEditando(false)
  }

  /** ⌘/Ctrl + ⏎ manda, Esc cancela: la misma regla que en el wizard. */
  function alTeclear(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      guardar()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelar()
    }
  }

  return (
    <Card className="animate-enter">
      <CardHeader>
        <CardTitle>Nota interna</CardTitle>
        <p className="t-helper">Sólo la ve el consultorio. No sale en el PDF.</p>
      </CardHeader>
      <CardBody>
        {editando ? (
          <div className="flex flex-col gap-3">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={alTeclear}
              maxLength={4000}
              autoFocus
              placeholder="Prefiere que la llamemos después de las 18. Trabaja cerca del consultorio."
              aria-label="Nota interna"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={guardar} loading={guardando}>
                Guardar
                <Kbd className="ml-0.5">⌘⏎</Kbd>
              </Button>
              <Button variant="ghost" onClick={cancelar} disabled={guardando}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : notaVisible ? (
          <div className="flex flex-col gap-3">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-body">
              {notaVisible}
            </p>
            <div>
              <Button variant="ghost" size="touch" className="md:h-[34px]" onClick={editar}>
                <Pencil aria-hidden />
                Editar la nota
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="t-helper">
              Todavía no hay ninguna nota. Sirve para lo que conviene recordar antes de volver a
              escribirle al paciente.
            </p>
            <div>
              <Button variant="secondary" size="touch" className="md:h-[34px]" onClick={editar}>
                <Pencil aria-hidden />
                Agregar una nota
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
