import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/form'
import { proficiencyLabel } from '@/lib/format'
import { PROFICIENCIES, type Proficiency } from '@/types'

/** Language + minimum level picker for search filters; emits "Name" or "Name:level". */
export function LanguageAdder({ options, onAdd }: { options: string[]; onAdd: (value: string) => void }) {
  const [name, setName] = useState('')
  const [min, setMin] = useState<Proficiency | ''>('')
  return (
    <div className="space-y-2">
      <Select aria-label="Language" value={name} onChange={(e) => setName(e.target.value)} className="h-10">
        <option value="">Choose a language</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
      <div className="flex gap-2">
        <Select aria-label="Minimum level" value={min} onChange={(e) => setMin(e.target.value as Proficiency | '')} className="h-10">
          <option value="">Any level</option>
          {PROFICIENCIES.map((p) => <option key={p} value={p}>{proficiencyLabel[p]} or better</option>)}
        </Select>
        <Button type="button" variant="outline" className="h-10 rounded-md" disabled={!name} onClick={() => { onAdd(min ? `${name}:${min}` : name); setName(''); setMin('') }}>Add language</Button>
      </div>
    </div>
  )
}
