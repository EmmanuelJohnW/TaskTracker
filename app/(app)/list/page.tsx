import type { Metadata } from "next"

import { ListView } from "@/components/list/list-view"

export const metadata: Metadata = { title: "List" }

export default function ListPage() {
  return <ListView />
}
