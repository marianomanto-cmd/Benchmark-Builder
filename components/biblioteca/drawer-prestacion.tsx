'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { actualizarPrestacion, crearPrestacion } from '@/app/actions/catalogo'
import { Field, Input, Switch, Textarea } from '@/components/ui'
import type { FilaPrestacion } from './tipos'
import { DrawerForm, FilaCampos, FilaSwitch } from './drawer-form'

/**
 * Alta y edición de prestaciones.
 *
 * `vigencia_dias` no es un detalle administrativo: es el plazo que el
 * wizard usa para calcular hasta cuándo vale el presupuesto, así que se
 * edita acá y se explica en el helper.
 */
export function DrawerPrestacion({
  prestacion,
  rubros,
  nombreSugerido,
  onCerrar,
  onGuardado,
}: {
  /** `null` = alta. */
  prestacion: FilaPrestacion | null
  /** Rubros ya usados, para autocompletar sin inventar una tabla nueva. */
  rubros: string[]
  /** Lo que se estaba buscando cuando no apareció ninguna. */
  nombreSugerido?: string
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = React.useState(prestacion?.nombre ?? nombreSugerido ?? '')
  const [codigo, setCodigo] = React.useState(prestacion?.codigo ?? '')
  const [rubro, setRubro] = React.useState(prestacion?.rubro ?? '')
  const [descripcion, setDescripcion] = React.useState(prestacion?.descripcion ?? '')
  const [vigenciaDias, setVigenciaDias] = React.useState(String(prestacion?.vigencia_dias ?? 30))
  const [activa, setActiva] = React.useState(prestacion?.activa ?? true)

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  function guardar() {
    setError(null)
    const dias = Number(vigenciaDias)

    iniciar(async () => {
      const entrada = {
        nombre,
        codigo,
        rubro,
        descripcion,
        vigencia_dias: Number.isFinite(dias) ? dias : 30,
        activa,
      }

      const resultado = prestacion
        ? await actualizarPrestacion(prestacion.id, entrada)
        : await crearPrestacion(entrada)

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success(prestacion ? 'Prestación actualizada' : 'Prestación creada')
      onGuardado()
      onCerrar()
    })
  }

  return (
    <DrawerForm
      open
      onOpenChange={(v) => {
        if (!v) onCerrar()
      }}
      titulo={prestacion ? 'Editar prestación' : 'Nueva prestación'}
      descripcion={
        prestacion
          ? 'Los cambios de nombre no tocan los presupuestos ya emitidos: cada uno guarda su propia copia.'
          : 'Después de crearla, cargale el arancel particular y las coberturas en Aranceles.'
      }
      formId="form-prestacion"
      guardando={guardando}
      error={error}
      onSubmit={guardar}
      textoGuardar={prestacion ? 'Guardar cambios' : 'Crear prestación'}
    >
      <Field label="Nombre" requerido htmlFor="prestacion-nombre">
        <Input
          id="prestacion-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Corona de porcelana"
          autoFocus
        />
      </Field>

      <FilaCampos>
        <Field
          label="Código"
          htmlFor="prestacion-codigo"
          helper="El del nomenclador, si lo usás."
        >
          <Input
            id="prestacion-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="21.01"
          />
        </Field>

        <Field label="Rubro" htmlFor="prestacion-rubro" helper="Agrupa la grilla de aranceles.">
          <Input
            id="prestacion-rubro"
            list="rubros-existentes"
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            placeholder="Prótesis"
          />
          <datalist id="rubros-existentes">
            {rubros.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
      </FilaCampos>

      <Field
        label="Descripción"
        htmlFor="prestacion-descripcion"
        helper="Se copia dentro del presupuesto como texto: escribila como querés que la lea el paciente."
      >
        <Textarea
          id="prestacion-descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Incluye tallado, provisorio y colocación."
        />
      </Field>

      <Field
        label="Vigencia del presupuesto"
        htmlFor="prestacion-vigencia"
        helper="Días que vale un presupuesto con esta prestación. Por defecto, 30."
      >
        <Input
          id="prestacion-vigencia"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={vigenciaDias}
          onChange={(e) => setVigenciaDias(e.target.value)}
          className="max-w-[140px]"
        />
      </Field>

      <FilaSwitch
        id="prestacion-activa"
        titulo="Activa"
        ayuda="Las inactivas no se ofrecen en el wizard, pero siguen en los presupuestos ya emitidos."
      >
        <Switch id="prestacion-activa" checked={activa} onCheckedChange={setActiva} />
      </FilaSwitch>
    </DrawerForm>
  )
}
