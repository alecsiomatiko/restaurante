import MenuPageClient from "./MenuPageClient"
import type { Metadata } from "next"

// Ensure menu page only references Supernova Burgers & Wings
export const metadata: Metadata = {
  title: "Menú | Supernova Burgers & Wings",
  description: "Explora nuestro menú de hamburguesas y alitas con sabores fuera de este mundo",
}

export default function MenuPage() {
  return <MenuPageClient />
}
