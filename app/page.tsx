import { Metadata } from "next"
import HomePageClient from "./components/HomePageClient"

export const metadata: Metadata = {
  title: "Supernova Burgers & Wings - Sabores fuera de este mundo",
  description: "Las mejores hamburguesas y alitas con sabores que están fuera de este mundo. Entrega a domicilio.",
}

export default function HomePage() {
  return <HomePageClient />
}