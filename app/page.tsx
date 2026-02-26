import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FeaturedEvents } from "@/components/landing/featured-events"
import { Categories } from "@/components/landing/categories"
import { Stats } from "@/components/landing/stats"
import { ContactSection } from "@/components/landing/contact-section"

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <FeaturedEvents />
      <Categories />
      <Stats />
      <ContactSection />
    </>
  )
}
