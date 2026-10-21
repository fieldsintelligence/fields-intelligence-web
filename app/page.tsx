import { Founder } from "@/components/Founder";
import { Hero } from "@/components/Hero";
import { HowItWorksTeaser } from "@/components/HowItWorksTeaser";
import { Problem } from "@/components/Problem";
import { Proof } from "@/components/Proof";
import { UseCases } from "@/components/UseCases";
import { ZeroRetention } from "@/components/ZeroRetention";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Proof />
      <ZeroRetention />
      <UseCases />
      <HowItWorksTeaser />
      <Founder />
    </>
  );
}
