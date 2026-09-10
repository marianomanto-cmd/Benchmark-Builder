'use client'

/**
 * Alta de prestación al vuelo — la excepción del patrón.
 *
 * Los otros mini-forms terminan en un campo obligatorio. Éste encadena
 * un segundo paso porque una prestación sin arancel vigente no sirve
 * para presupuestar: quedaría en la biblioteca sin precio y el próximo
 * que la elija se choca con el mismo bloqueo.
 *
 * Por eso la prestación se inserta recién cuando el arancel está listo:
 * si alguien abandona en el paso 2, no queda una prestación huérfana.
 */

import { Info } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Banner, Checkbox, Field, Input, InputMonto, Textarea } from '@/components/ui'
import type { Arancel, Prestacion } from '@/lib/types'

import { CabeceraCapa, MarcoCapa, PieCapa, useGuardadoUnico } from './capa'
import { useCrearArancel, useCrearPrestacion } from './consultas'
import { ARANCEL_VACIO, CamposArancel, type ValoresArancel } from './form-arancel'

const VIGENCIA_POR_DEFECTO = 30

export function FormPrestacion({
  textoInicial,
  obraSocialId,
  obraSocialNombre,
  onListo,
  onCancelar,
}: {
  textoInicial: string
  /** Obra social del presupuesto. `null` = particular. */
  obraSocialId: string | null
  obraSocialNombre: string
  onListo: (prestacion: Prestacion, arancel: Arancel) => void
  onCancelar: () => void
}) {
  const [paso, setPaso] = React.useState<1 | 2>(1)

  // Paso 1
  const [nombre, setNombre] = React.useState(textoInicial)
  const [codigo, setCodigo] = React.useState('')
  const [rubro, setRubro] = React.useState('')
  const [descripcion, setDescripcion] = React.useState('')
  const [vigenciaDias, setVigenciaDias] = React.useState(VIGENCIA_POR_DEFECTO)

  // Paso 2
  const [valores, setValores] = React.useState<ValoresArancel>(ARANCEL_VACIO)
  const [tambienParticular, setTambienParticular] = React.useState(false)
  const [montoParticular, setMontoParticular] = React.useState(0)

  const [error, setError] = React.useState<string | null>(null)

  // Si el arancel falla después de crear la prestación, no la volvemos
  // a insertar en el reintento: quedaría duplicada en la biblioteca.
  const [prestacionCreada, setPrestacionCreada] = React.useState<Prestacion | null>(null)

  const crearPrestacion = useCrearPrestacion()
  const crearArancel = useCrearArancel()

  const esParticular = obraSocialId === null
  const guardando = crearPrestacion.isPending || crearArancel.isPending
  const enviar = useGuardadoUnico(guardar)

  function seguir() {
    if (nombre.trim().length < 3) {
      setError('Escribí el nombre de la prestación.')
      return
    }
    setError(null)
    setPaso(2)
  }

  async function guardar() {
    if (valores.monto <= 0) {
      setError('Cargá el monto: sin arancel vigente la prestación no se puede presupuestar.')
      return
    }
    if (valores.cobertura_tipo !== 'ninguna' && valores.cobertura_valor <= 0) {
      setError('Cargá cuánto cubre la obra social, o elegí “No cubre”.')
      return
    }
    if (tambienParticular && montoParticular <= 0) {
      setError('Cargá el valor particular o destildá la opción.')
      return
    }

    try {
      const prestacion =
        prestacionCreada ??
        (await crearPrestacion.mutateAsync({
          nombre: nombre.trim(),
          codigo: codigo.trim() || null,
          rubro: rubro.trim() || null,
          descripcion: descripcion.trim() || null,
          vigencia_dias: vigenciaDias > 0 ? vigenciaDias : VIGENCIA_POR_DEFECTO,
        }))
      setPrestacionCreada(prestacion)

      const arancel = await crearArancel.mutateAsync({
        prestacion_id: prestacion.id,
        obra_social_id: obraSocialId,
        monto: valores.monto,
        cobertura_tipo: valores.cobertura_tipo,
        cobertura_valor: valores.cobertura_valor,
      })

      // El particular es opcional y no bloquea: si falla, la prestación
      // ya quedó presupuestable para la obra social de este presupuesto.
      if (!esParticular && tambienParticular && montoParticular > 0) {
        try {
          await crearArancel.mutateAsync({
            prestacion_id: prestacion.id,
            obra_social_id: null,
            monto: montoParticular,
            cobertura_tipo: 'ninguna',
            cobertura_valor: 0,
          })
        } catch {
          toast.warning('La prestación quedó cargada, pero el valor particular no se pudo guardar.')
        }
      }

      toast.success(`${prestacion.nombre} quedó en la biblioteca, con arancel vigente`)
      onListo(prestacion, arancel)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la prestación.')
    }
  }

  if (paso === 1) {
    return (
      <MarcoCapa onEnviar={seguir}>
        <CabeceraCapa
          titulo="Nueva prestación"
          ayuda="Primero qué es. En el paso siguiente, cuánto sale."
          onVolver={onCancelar}
        />

        <div className="flex flex-col gap-4">
          <Field label="Nombre" requerido htmlFor="npres-nombre" error={error}>
            <Input
              id="npres-nombre"
              autoFocus
              value={nombre}
              invalido={Boolean(error)}
              placeholder="Endodoncia unirradicular"
              onChange={(e) => {
                setNombre(e.target.value)
                setError(null)
              }}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" htmlFor="npres-codigo" helper="El del nomenclador, si lo usan.">
              <Input
                id="npres-codigo"
                value={codigo}
                placeholder="03.01.01"
                onChange={(e) => setCodigo(e.target.value)}
              />
            </Field>

            <Field label="Rubro" htmlFor="npres-rubro" helper="Agrupa la biblioteca y los aumentos.">
              <Input
                id="npres-rubro"
                value={rubro}
                placeholder="Endodoncia"
                onChange={(e) => setRubro(e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Descripción"
            htmlFor="npres-desc"
            helper="Se copia al presupuesto como texto del ítem. La lee el paciente."
          >
            <Textarea
              id="npres-desc"
              value={descripcion}
              placeholder="Tratamiento de conducto en pieza de una raíz, incluye radiografías de control."
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>

          <Field
            label="Vigencia sugerida"
            htmlFor="npres-vig"
            helper="Días que dura un presupuesto que incluya esta prestación."
          >
            <div className="flex items-center gap-2">
              <Input
                id="npres-vig"
                inputMode="numeric"
                className="w-24 text-right tabular-nums"
                value={vigenciaDias === 0 ? '' : String(vigenciaDias)}
                onChange={(e) => {
                  const limpio = e.target.value.replace(/[^\d]/g, '')
                  setVigenciaDias(limpio === '' ? 0 : Math.min(365, Number(limpio)))
                }}
              />
              <span className="text-[14px] text-muted">días</span>
            </div>
          </Field>
        </div>

        <PieCapa
          etiqueta="Seguir con el arancel"
          onCancelar={onCancelar}
          onGuardar={seguir}
          deshabilitado={nombre.trim().length < 3}
        />
      </MarcoCapa>
    )
  }

  return (
    <MarcoCapa onEnviar={enviar}>
      <CabeceraCapa
        titulo={`Arancel de ${nombre.trim()}`}
        ayuda={
          <>
            Para <strong className="font-semibold text-ink">{obraSocialNombre}</strong>. Vigente
            desde hoy.
          </>
        }
        onVolver={() => setPaso(1)}
      />

      <Banner
        tono="info"
        icono={<Info className="size-5" />}
        titulo="Por qué te pedimos esto ahora"
        className="mb-4"
      >
        Una prestación sin arancel vigente no se puede presupuestar: quedaría en la biblioteca sin
        precio y el próximo que la elija se choca con lo mismo.
      </Banner>

      <CamposArancel
        autoFoco
        idMonto="npres-monto"
        valores={valores}
        onChange={(v) => {
          setValores(v)
          setError(null)
        }}
      />

      {!esParticular && (
        <div className="mt-4 rounded-input border border-hairline bg-card p-4">
          <label className="flex items-start gap-3">
            <Checkbox
              className="mt-0.5"
              checked={tambienParticular}
              onCheckedChange={(v) => setTambienParticular(v === true)}
            />
            <span className="min-w-0">
              <span className="block font-sans text-[14px] text-ink">
                Cargar también el valor particular
              </span>
              <span className="t-helper block">
                Es el precio sin obra social. Sirve de referencia cuando otro paciente no tiene
                convenio.
              </span>
            </span>
          </label>

          {tambienParticular && (
            <div className="mt-3 max-w-[240px]">
              <Field label="Valor particular" htmlFor="npres-particular">
                <InputMonto
                  id="npres-particular"
                  value={montoParticular === 0 ? '' : montoParticular}
                  onChange={setMontoParticular}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="t-helper mt-3 text-warm-ink" role="alert">
          {error}
        </p>
      )}

      <PieCapa
        etiqueta="Crear prestación y agregarla"
        onCancelar={onCancelar}
        onGuardar={enviar}
        guardando={guardando}
        deshabilitado={valores.monto <= 0}
      />
    </MarcoCapa>
  )
}
