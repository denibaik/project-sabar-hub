import { redirect } from "next/navigation"

// Halaman root diarahkan ke dashboard sungguhan.
// Sebelumnya di sini ada mock berisi angka bisnis fiktif (jumlah order,
// pendapatan, status bot) yang tampil seolah data asli — menyesatkan begitu
// aplikasi dipakai sungguhan.
export default function Home() {
  redirect("/dashboard")
}
