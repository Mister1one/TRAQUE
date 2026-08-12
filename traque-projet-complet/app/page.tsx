import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import Pipeline from "@/components/Pipeline";
import Features from "@/components/Features";
import Gamification from "@/components/Gamification";
import Waitlist from "@/components/Waitlist";
import Footer from "@/components/Footer";
import { getLang } from "@/lib/get-lang";
import { getDictionary } from "@/lib/i18n";

export default async function Home() {
  const lang = await getLang();
  const dict = getDictionary(lang);

  return (
    <main>
      <Nav lang={lang} dict={dict.nav} />
      <Hero dict={dict.hero} radarDict={dict.radar} />
      <Problem dict={dict.problem} />
      <Pipeline dict={dict.pipeline} />
      <Features dict={dict.features} />
      <Gamification dict={dict.gamification} />
      <Waitlist dict={dict.waitlist} />
      <Footer dict={dict.footer} />
    </main>
  );
}
