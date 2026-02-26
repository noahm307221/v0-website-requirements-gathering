import { CategoryCard } from "@/components/category-card"
import { categories } from "@/lib/data"

export function Categories() {
  return (
    <section id="categories" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">
              Activities
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Find your{" "}
              <span className="font-serif italic text-accent">thing</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground lg:text-right">
            Clubs define their own categories. The range of activities grows with
            the community.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  )
}
