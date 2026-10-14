import { HomeScreen } from "@/components/home/HomeScreen";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <main className="page">
        <HomeScreen />
      </main>
      <SiteFooter />
    </>
  );
}
