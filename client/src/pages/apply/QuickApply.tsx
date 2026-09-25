import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BriefcaseBusiness, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Field, Spinner, Textarea } from '@/components/ui/form'
import { FileDrop } from '@/components/ui/file-drop'
import { api, ApiError } from '@/lib/api'
import { candidateKeys, multipart, useMyProfile } from '@/hooks/useCandidate'
import type { ApplySubmitResult, JobDetail } from '@/types'
import { translateMessage, useT } from '@/i18n'
import { profileText } from '@/i18n/profile'

/** One-step application for candidates who already have a profile. */
export function QuickApply({ job, onDone }: { job: JobDetail; onDone: (r: ApplySubmitResult) => void }) {
  const queryClient = useQueryClient()
  const { data: profile, isPending } = useMyProfile()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>()
  const t = useT(profileText)
  const apply = useMutation({
    mutationFn: () => api<{ id: string; applicantNumber: string; jobTitle: string }>('/api/applications', { method: 'POST', body: multipart({ jobId: job.id, coverLetterText: text || undefined }, { coverLetter: file }) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.applications })
      onDone({ applicantNumber: res.applicantNumber, jobTitle: res.jobTitle } as ApplySubmitResult)
    },
  })
  const alreadyApplied = apply.error instanceof ApiError && apply.error.code === 'ALREADY_APPLIED'

  const submit = () => {
    if (job.coverLetterPolicy === 'required' && !text.trim() && !file) return setError(translateMessage('This position requires a cover letter: write one or upload a file'))
    setError(undefined)
    apply.mutate()
  }

  return (
    <section className="px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.quick.eyebrow}</p>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-4xl">{job.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-foreground/65"><BriefcaseBusiness size={16} aria-hidden /> {job.company.name} · {job.location}</p>

        <div className="mt-8 space-y-6 rounded-lg border border-foreground/12 bg-surface p-5 sm:p-8">
          {isPending || !profile ? (
            <Spinner className="size-5 text-foreground/50" />
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-md bg-chip p-4">
              <div>
                <p className="font-semibold">{profile.fullName} <span className="font-mono text-sm font-normal text-foreground/60">· {profile.applicantNumber}</span></p>
                <p className="text-sm text-foreground/65">{profile.headline} · {t.quick.years(profile.totalYearsExperience)}</p>
                {profile.cvFile && <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/65"><FileText size={14} aria-hidden /> {profile.cvFile.originalName}</p>}
              </div>
              <Link to="/candidate/profile" className="text-sm font-semibold text-brand">{t.quick.update}</Link>
            </div>
          )}

          {job.coverLetterPolicy !== 'none' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">{t.apply.coverLetter} <span className="font-normal text-foreground/55">{job.coverLetterPolicy === 'required' ? t.apply.required : t.apply.optional}</span></p>
              <Field label={t.apply.writeHere} error={error}>
                {(ids) => <Textarea {...ids} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.quick.letterPlaceholder} />}
              </Field>
              <FileDrop label={t.apply.uploadFile} file={file} onChange={setFile} />
            </div>
          )}

          {apply.error && (
            <Alert variant={alreadyApplied ? 'info' : 'error'}>
              {apply.error.message}. {alreadyApplied && <Link to="/candidate/applications" className="font-semibold underline">{t.quick.seeApplications}</Link>}
            </Alert>
          )}
          <Button type="button" onClick={submit} disabled={apply.isPending || !profile} className="h-11 w-full rounded-md bg-brand text-brand-foreground hover:bg-brand-hover">
            {apply.isPending && <Spinner />} {t.apply.submitApplication}
          </Button>
        </div>
      </div>
    </section>
  )
}
