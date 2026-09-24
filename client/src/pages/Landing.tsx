import { Hero } from '@/components/landing/Hero'
import { PopularSkills } from '@/components/landing/PopularSkills'
import { FeaturedJobs } from '@/components/landing/FeaturedJobs'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { WhyAI101 } from '@/components/landing/WhyAI101'
import { Testimonials } from '@/components/landing/Testimonials'
import { FinalCta } from '@/components/landing/FinalCta'
import { Faq } from '@/components/landing/Faq'

export default function Landing() {
  return (
    <>
      <Hero />
      <PopularSkills />
      <FeaturedJobs />
      <HowItWorks />
      <WhyAI101 />
      <Testimonials />
      <FinalCta />
      <Faq />
    </>
  )
}
