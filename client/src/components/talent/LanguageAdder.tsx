import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/form'
import { proficiencyLabel } from '@/lib/format'
import { PROFICIENCIES, type Proficiency } from '@/types'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

/** Language + minimum level picker for search filters; emits "Name" or "Name:level". */
export function LanguageAdder({ options, onAdd }: { options: string[]; onAdd: (value: string) => void }) {
  const [name, setName] = useState('')
  const [min, setMin] = useState<Proficiency | ''>('')
  const t = useT(common).languageFilter
  return (
    <div className="space-y-2">
      <Select aria-label={t.language} value={name} onChange={(e) => setName(e.target.value)} className="h-10">
        <option value="">{t.choose}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
      <div className="flex flex-wrap gap-2">
        <Select aria-label={t.minLevel} value={min} onChange={(e) => setMin(e.target.value as Proficiency | '')} className="h-10 min-w-36 flex-1">
          <option value="">{t.anyLevel}</option>
          {PROFICIENCIES.map((p) => <option key={p} value={p}>{t.orBetter(proficiencyLabel[p])}</option>)}
        </Select>
        <Button type="button" variant="outline" className="h-10 grow rounded-md" disabled={!name} onClick={() => { onAdd(min ? `${name}:${min}` : name); setName(''); setMin('') }}>{t.add}</Button>
      </div>
    </div>
  )
}
