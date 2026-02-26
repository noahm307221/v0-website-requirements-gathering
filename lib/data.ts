export type Category = {
  id: string
  name: string
  icon: string
  color: string
}

export type Event = {
  id: string
  title: string
  description: string
  categoryId: string
  date: string
  time: string
  location: string
  address: string
  spotsTotal: number
  spotsTaken: number
  image: string
  organizer: string
  price: string
}

export const categories: Category[] = [
  { id: "padel", name: "Padel", icon: "Volleyball", color: "bg-emerald-100 text-emerald-700" },
  { id: "running", name: "Running", icon: "Footprints", color: "bg-sky-100 text-sky-700" },
  { id: "yoga", name: "Yoga", icon: "Flower2", color: "bg-amber-100 text-amber-700" },
  { id: "tennis", name: "Tennis", icon: "CircleDot", color: "bg-rose-100 text-rose-700" },
  { id: "cycling", name: "Cycling", icon: "Bike", color: "bg-indigo-100 text-indigo-700" },
  { id: "crossfit", name: "CrossFit", icon: "Dumbbell", color: "bg-orange-100 text-orange-700" },
  { id: "swimming", name: "Swimming", icon: "Waves", color: "bg-cyan-100 text-cyan-700" },
  { id: "hiking", name: "Hiking", icon: "Mountain", color: "bg-lime-100 text-lime-700" },
]

export const events: Event[] = [
  {
    id: "1",
    title: "Sunset Padel Tournament",
    description: "Join us for an exciting doubles tournament at the newly opened courts. All skill levels welcome. Refreshments provided.",
    categoryId: "padel",
    date: "2026-03-10",
    time: "17:00",
    location: "Padel Club Central",
    address: "123 Sports Ave, London",
    spotsTotal: 24,
    spotsTaken: 18,
    image: "/images/padel.jpg",
    organizer: "London Padel League",
    price: "Free",
  },
  {
    id: "2",
    title: "Morning Run Club - 5K",
    description: "Weekly community run through the park. Perfect for beginners and seasoned runners alike. Meet at the fountain.",
    categoryId: "running",
    date: "2026-03-08",
    time: "07:00",
    location: "Hyde Park",
    address: "Hyde Park Corner, London",
    spotsTotal: 50,
    spotsTaken: 32,
    image: "/images/running.jpg",
    organizer: "RunLDN Collective",
    price: "Free",
  },
  {
    id: "3",
    title: "Vinyasa Flow Under the Stars",
    description: "An evening outdoor yoga session with live ambient music. Bring your own mat or borrow one of ours.",
    categoryId: "yoga",
    date: "2026-03-12",
    time: "19:30",
    location: "Primrose Hill Studio",
    address: "45 Regent Park Rd, London",
    spotsTotal: 30,
    spotsTaken: 27,
    image: "/images/yoga.jpg",
    organizer: "Urban Flow Yoga",
    price: "$12",
  },
  {
    id: "4",
    title: "Doubles Tennis Mixer",
    description: "Mixed-level doubles event. Get paired up randomly and play three sets. Great way to meet fellow tennis enthusiasts.",
    categoryId: "tennis",
    date: "2026-03-15",
    time: "10:00",
    location: "Queen's Club",
    address: "Palliser Rd, London",
    spotsTotal: 16,
    spotsTaken: 12,
    image: "/images/tennis.jpg",
    organizer: "Ace Community Tennis",
    price: "$8",
  },
  {
    id: "5",
    title: "Thames Cycling Tour",
    description: "A scenic 30-mile ride along the Thames. Stops for coffee and snacks. Intermediate level recommended.",
    categoryId: "cycling",
    date: "2026-03-14",
    time: "08:00",
    location: "Tower Bridge",
    address: "Tower Bridge Rd, London",
    spotsTotal: 40,
    spotsTaken: 25,
    image: "/images/cycling.jpg",
    organizer: "London Cycling Network",
    price: "Free",
  },
  {
    id: "6",
    title: "CrossFit WOD Challenge",
    description: "Test your limits with this week's Workout of the Day. Scaled options available for all fitness levels.",
    categoryId: "crossfit",
    date: "2026-03-09",
    time: "06:30",
    location: "Iron Box Gym",
    address: "78 Brick Lane, London",
    spotsTotal: 20,
    spotsTaken: 15,
    image: "/images/crossfit.jpg",
    organizer: "Iron Box Community",
    price: "$15",
  },
  {
    id: "7",
    title: "Open Water Swim Session",
    description: "Guided open water swimming at the Serpentine. Safety kayakers on standby. Wetsuits recommended.",
    categoryId: "swimming",
    date: "2026-03-11",
    time: "06:00",
    location: "The Serpentine",
    address: "Hyde Park, London",
    spotsTotal: 25,
    spotsTaken: 20,
    image: "/images/swimming.jpg",
    organizer: "Wild Swim London",
    price: "$5",
  },
  {
    id: "8",
    title: "Hampstead Heath Trail Hike",
    description: "Moderate difficulty trail hike through Hampstead Heath. Takes about 2.5 hours. Dogs welcome.",
    categoryId: "hiking",
    date: "2026-03-16",
    time: "09:00",
    location: "Hampstead Heath",
    address: "Hampstead, London",
    spotsTotal: 35,
    spotsTaken: 10,
    image: "/images/hiking.jpg",
    organizer: "Trail Blazers UK",
    price: "Free",
  },
  {
    id: "9",
    title: "Padel Beginners Workshop",
    description: "Never played padel? This introductory session covers all the basics. Rackets and balls provided.",
    categoryId: "padel",
    date: "2026-03-13",
    time: "14:00",
    location: "Padel Hub East",
    address: "92 Shoreditch High St, London",
    spotsTotal: 12,
    spotsTaken: 8,
    image: "/images/padel.jpg",
    organizer: "Padel For All",
    price: "$10",
  },
  {
    id: "10",
    title: "Saturday 10K Social Run",
    description: "A social-paced 10K run finishing at a local cafe for brunch. Community vibes, no pressure.",
    categoryId: "running",
    date: "2026-03-14",
    time: "08:30",
    location: "Victoria Park",
    address: "Victoria Park, London",
    spotsTotal: 60,
    spotsTaken: 45,
    image: "/images/running.jpg",
    organizer: "Brunch Runners",
    price: "Free",
  },
]

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}

export function getEventsByCategory(categoryId: string): Event[] {
  return events.filter((e) => e.categoryId === categoryId)
}

export function getFeaturedEvents(): Event[] {
  return events.slice(0, 6)
}
