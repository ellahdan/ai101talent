import { useEffect, useState, type ReactNode } from 'react'
import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Download, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Alert, Field, Spinner, Textarea } from '@/components/ui/form'
import { FileDrop } from '@/components/ui/file-drop'
import { BasicsSection, ExperienceSection, PreferencesSection, SkillsSection, type ProfileFormValues } from '@/components/profile/ProfileSections'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { profileSchema } from '@/lib/validation/candidate'
import { candidateKeys, openMyFile, useMyProfile, useUpdateProfile } from '@/hooks/useCandidate'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { CandidateProfile } from '@/types'
import { NoProfile } from './CandidateLayout'
import { formatDate } from '@/lib/format'
import { useT } from '@/i18n'
import { candidateText } from '@/i18n/candidate'

const toForm = (p: CandidateProfile): ProfileFormValues => ({
  fullName: p.fullName,
  email: p.email,
  phone: p.phone ?? '',
  location: { country: p.location.country, city: p.location.city ?? '' },
  links: { linkedin: p.links.linkedin ?? '', portfolio: p.links.portfolio ?? '' },
  headline: p.headline,
  totalYearsExperience: p.totalYearsExperience,
  skills: p.skills,
  tools: p.tools,
  languages: p.languages,
  workHistory: p.workHistory.map((w) => ({ ...w, description: w.description ?? '' })),
  education: p.education.map((e) => ({ ...e, degree: e.degree ?? '', field: e.field ?? '' })),
  availability: p.availability,
  noticePeriodWeeks: p.noticePeriodWeeks,
  workMode: p.workMode,
  visible: p.visible,
  coverLetterText: p.coverLetter?.text ?? '',
})

export default function EditProfile() {
  const t = useT(candidateText).editor
  useDocumentTitle(t.title)
  const { data: profile, isPending } = useMyProfile()
  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (!profile) return <><PageHeader title={t.title} /><NoProfile /></>
  return <ProfileForm profile={profile} />
}

function ProfileForm({ profile }: { profile: CandidateProfile }) {
  const update = useUpdateProfile()
  const queryClient = useQueryClient()
  const t = useT(candidateText).editor
  const [cv, setCv] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState<File | null>(null)
  const form = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileFormValues>, defaultValues: toForm(profile) })
  const { register, formState: { errors, dirtyFields } } = form

  // Keep the form in sync when the saved profile changes (e.g. after saving).
  useEffect(() => form.reset(toForm(profile)), [profile, form])

  const removeLetter = useMutation({
    mutationFn: () => api<CandidateProfile>('/api/candidates/me/cover-letter', { method: 'DELETE' }),
    onSuccess: (p) => {
      queryClient.setQueryData(candidateKeys.profile, p)
      toast.success(t.coverLetterRemoved)
    },
  })

  const onSubmit = form.handleSubmit(
    (values) =>
      update.mutate(
        { data: values, cv, coverLetter },
        {
          onSuccess: () => {
            setCv(null)
            setCoverLetter(null)
            toast.success(t.saved)
          },
        },
      ),
    () => toast.error(t.fixErrors),
  )

  // Per-field dirtiness: the form-level isDirty flag can stay true after reset because of empty field-array inputs.
  const dirty = Object.keys(dirtyFields).length > 0 || Boolean(cv) || Boolean(coverLetter)

  return (
    <>
      <PageHeader title={t.title} description={<>{t.applicantNumber} <span className="font-mono font-semibold text-foreground">{profile.applicantNumber}</span> · {t.description(formatDate(profile.updatedAt))}</>} />
      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-6 pb-24">
          <Card><BasicsSection /></Card>
          <Card><SkillsSection /></Card>
          <Card><ExperienceSection /></Card>
          <Card>
            <section className="space-y-5">
              <h2 className="text-lg font-semibold tracking-[-.02em]">{t.documents}</h2>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-chip px-4 py-3 text-sm">
                <span>{t.currentCv} <strong>{profile.cvFile?.originalName ?? t.none}</strong></span>
                {profile.cvFile && (
                  <button type="button" onClick={() => openMyFile('cv').catch((e) => toast.error(e.message))} className="inline-flex items-center gap-1.5 font-semibold text-brand">
                    <Download size={15} aria-hidden /> {t.download}
                  </button>
                )}
              </div>
              <FileDrop label={t.replaceCv} file={cv} onChange={setCv} hint={t.replaceCvHint} />
              <Field label={t.coverLetter} optional error={errors.coverLetterText?.message} hint={t.coverLetterHint}>
                {(ids) => <Textarea {...ids} rows={5} {...register('coverLetterText')} />}
              </Field>
              {profile.coverLetter?.file && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-chip px-4 py-3 text-sm">
                  <span>{t.coverLetterFile} <strong>{profile.coverLetter.file.originalName}</strong></span>
                  <span className="flex gap-4">
                    <button type="button" onClick={() => openMyFile('cover-letter').catch((e) => toast.error(e.message))} className="inline-flex items-center gap-1.5 font-semibold text-brand"><Download size={15} aria-hidden /> {t.download}</button>
                    <button type="button" onClick={() => removeLetter.mutate()} className="inline-flex items-center gap-1.5 font-semibold text-destructive"><Trash2 size={15} aria-hidden /> {t.remove}</button>
                  </span>
                </div>
              )}
              <FileDrop label={profile.coverLetter?.file ? t.replaceLetter : t.uploadLetter} file={coverLetter} onChange={setCoverLetter} />
            </section>
          </Card>
          <Card><PreferencesSection /></Card>

          {update.error && <Alert variant="error">{update.error.message}</Alert>}

          {/* Sticky save bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-8">
              <span className="text-sm text-foreground/60" aria-live="polite">{dirty ? t.unsaved : t.allSaved}</span>
              <Button type="button" variant="outline" className="h-10 rounded-md" disabled={!dirty || update.isPending} onClick={() => { form.reset(toForm(profile)); setCv(null); setCoverLetter(null) }}>
                {t.discard}
              </Button>
              <Button type="submit" disabled={!dirty || update.isPending} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
                {update.isPending && <Spinner />} {t.save}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-foreground/12 bg-surface p-5 sm:p-8">{children}</div>
}
